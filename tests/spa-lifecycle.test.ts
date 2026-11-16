// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SPALifecycleManager } from '../src/extension/spa-lifecycle';
import { PlatformUI } from '../src/adapters';

describe('SPA Lifecycle Manager Seam (SPALifecycleManager)', () => {
  let mockUi: PlatformUI;
  let mountedPosts: HTMLElement[];

  beforeEach(() => {
    document.body.innerHTML = '';
    mountedPosts = [];
    mockUi = {
      mountAction: vi.fn((post: HTMLElement) => {
        if (post.dataset.injected) {
          return null;
        }
        post.dataset.injected = 'true';
        const btn = document.createElement('button');
        btn.className = 'thread-to-llm-action';
        post.appendChild(btn);
        mountedPosts.push(post);
        return btn;
      }),
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('injects action button onto existing <shreddit-post> elements upon start()', () => {
    const post = document.createElement('shreddit-post');
    document.body.appendChild(post);

    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();

    expect(mockUi.mountAction).toHaveBeenCalledTimes(1);
    expect(mockUi.mountAction).toHaveBeenCalledWith(post);

    manager.stop();
  });

  it('observes DOM mutations and dynamically injects newly added <shreddit-post> elements', async () => {
    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();

    expect(mockUi.mountAction).toHaveBeenCalledTimes(0);

    // Dynamically insert a post
    const dynamicPost = document.createElement('shreddit-post');
    document.body.appendChild(dynamicPost);

    // MutationObserver in happy-dom executes asynchronously or upon next microtask
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockUi.mountAction).toHaveBeenCalledWith(dynamicPost);
    expect(mockUi.mountAction).toHaveBeenCalledTimes(1);

    manager.stop();
  });

  it('injects post nested within a newly added container subtree', async () => {
    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();

    const feedContainer = document.createElement('div');
    feedContainer.className = 'sub-feed';
    const nestedPost = document.createElement('shreddit-post');
    feedContainer.appendChild(nestedPost);

    document.body.appendChild(feedContainer);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockUi.mountAction).toHaveBeenCalledWith(nestedPost);
    expect(mockUi.mountAction).toHaveBeenCalledTimes(1);

    manager.stop();
  });

  it('guarantees idempotency and never injects duplicates on the same post', async () => {
    const post = document.createElement('shreddit-post');
    document.body.appendChild(post);

    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();

    expect(mockUi.mountAction).toHaveBeenCalledTimes(1);

    // Trigger injectAll again
    manager.injectAll();
    expect(mockUi.mountAction).toHaveBeenCalledTimes(2); // mountAction called, but our mock returned null for duplicate
    expect(post.querySelectorAll('.thread-to-llm-action').length).toBe(1);

    manager.stop();
  });

  it('stops observing after stop() is called', async () => {
    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();
    manager.stop();

    const latePost = document.createElement('shreddit-post');
    document.body.appendChild(latePost);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockUi.mountAction).not.toHaveBeenCalled();
  });

  it('re-injects on popstate event', () => {
    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();

    const post = document.createElement('shreddit-post');
    document.body.appendChild(post);

    window.dispatchEvent(new Event('popstate'));
    expect(mockUi.mountAction).toHaveBeenCalledWith(post);

    manager.stop();
  });

  it('mutation echo guardrail: ignores DOM mutations from extension elements to prevent echo loops', async () => {
    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();

    const post = document.createElement('shreddit-post');
    document.body.appendChild(post);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockUi.mountAction).toHaveBeenCalledTimes(1);

    // Directly append an extension UI element inside the post (simulating button or label insertion)
    const injectedElement = document.createElement('div');
    injectedElement.className = 'thread-to-llm-action';
    post.appendChild(injectedElement);

    await new Promise((resolve) => setTimeout(resolve, 50));
    // Must NOT trigger another mountAction call on the post
    expect(mockUi.mountAction).toHaveBeenCalledTimes(1);

    manager.stop();
  });

  it('does not trigger action bar re-evaluation on mutations within [slot="credit-bar"]', async () => {
    const post = document.createElement('shreddit-post');
    const creditBar = document.createElement('div');
    creditBar.setAttribute('slot', 'credit-bar');
    post.appendChild(creditBar);
    document.body.appendChild(post);

    const manager = new SPALifecycleManager({ ui: mockUi, root: document.body });
    manager.start();
    expect(mockUi.mountAction).toHaveBeenCalledTimes(1);
    vi.mocked(mockUi.mountAction).mockClear();

    // Dynamically insert an element into slot="credit-bar"
    const newBadge = document.createElement('span');
    newBadge.textContent = 'Karma badge';
    creditBar.appendChild(newBadge);

    await new Promise((resolve) => setTimeout(resolve, 50));
    // Must NOT trigger another mountAction call because credit-bar is excluded from ACTION_BAR_SELECTORS
    expect(mockUi.mountAction).not.toHaveBeenCalled();

    manager.stop();
  });
});
