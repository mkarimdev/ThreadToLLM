// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initialize } from '../src/extension/content';

describe('Post Scope Injection Guard (Bug Repro: button appears at home)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function createApp(pageType: string): HTMLElement {
    const app = document.createElement('shreddit-app');
    app.setAttribute('pagetype', pageType);
    document.body.appendChild(app);
    return app;
  }

  function createPost(parent: HTMLElement, id: string): HTMLElement {
    const post = document.createElement('shreddit-post');
    post.setAttribute('id', id);
    post.setAttribute('post-title', `Post ${id}`);
    post.setAttribute('author', 'scopeTester');
    post.setAttribute('permalink', `/r/CommandCode/comments/${id}/scope_test/`);
    parent.appendChild(post);
    return post;
  }

  it('does NOT inject the action button on posts when viewing the home page feed', () => {
    // Simulate Reddit Home page: window.location is home ('/'), shreddit-app has pagetype="home"
    const shredditApp = createApp('home');

    const feed = document.createElement('shreddit-feed');
    const feedPost = createPost(feed, 't3_home_post');
    shredditApp.appendChild(feed);

    const runtime = initialize({
      hostname: 'www.reddit.com',
      document: document,
    });

    // The user's bug symptom: button appears at home on feed posts.
    // It should NOT appear at home on the feed!
    expect(feedPost.querySelector('.thread-to-llm-action')).toBeNull();

    runtime.cleanup();
  });

  it.each(['popular', 'all', 'community'])(
    'does NOT inject the action button on the %s feed listing',
    (pageType) => {
      const shredditApp = createApp(pageType);
      const feed = document.createElement('shreddit-feed');
      const feedPost = createPost(feed, `t3_${pageType}_post`);
      shredditApp.appendChild(feed);

      const runtime = initialize({ hostname: 'www.reddit.com', document });
      expect(feedPost.querySelector('.thread-to-llm-action')).toBeNull();
      runtime.cleanup();
    }
  );

  it('injects the action button on the post when viewing a post thread page', () => {
    window.history.pushState({}, '', '/r/CommandCode/comments/xyz123/deepseek_too_eager/');
    const shredditApp = createApp('post_detail');
    const post = createPost(shredditApp, 't3_xyz123');

    const runtime = initialize({ hostname: 'www.reddit.com', document });

    expect(post.querySelector('.thread-to-llm-action')).not.toBeNull();

    runtime.cleanup();
  });

  it('injects the action button on a post opened in a modal over a feed', () => {
    const shredditApp = createApp('home');

    const feed = document.createElement('shreddit-feed');
    const feedPost = createPost(feed, 't3_feed_behind_modal');
    shredditApp.appendChild(feed);

    const modal = document.createElement('faceplate-modal');
    const modalPost = createPost(modal, 't3_modal_post');
    shredditApp.appendChild(modal);

    const runtime = initialize({ hostname: 'www.reddit.com', document });

    expect(modalPost.querySelector('.thread-to-llm-action')).not.toBeNull();
    expect(feedPost.querySelector('.thread-to-llm-action')).toBeNull();

    runtime.cleanup();
  });

  it('does NOT inject the action button on recommendation feed cards of a post thread page', () => {
    window.history.pushState({}, '', '/r/CommandCode/comments/xyz123/deepseek_too_eager/');
    const shredditApp = createApp('post_detail');
    const focalPost = createPost(shredditApp, 't3_xyz123');

    const recommendations = document.createElement('shreddit-feed');
    const recommendedPost = createPost(recommendations, 't3_recommended');
    shredditApp.appendChild(recommendations);

    const runtime = initialize({ hostname: 'www.reddit.com', document });

    expect(focalPost.querySelector('.thread-to-llm-action')).not.toBeNull();
    expect(recommendedPost.querySelector('.thread-to-llm-action')).toBeNull();

    runtime.cleanup();
  });

  it('re-mounts the Thread Action when navigation returns from a feed to a thread', () => {
    window.history.pushState({}, '', '/r/CommandCode/comments/xyz123/deepseek_too_eager/');
    const app = createApp('post_detail');
    const post = createPost(app, 't3_returning_thread');

    const runtime = initialize({ hostname: 'www.reddit.com', document });
    expect(post.querySelector('.thread-to-llm-action')).not.toBeNull();

    // SPA navigation back to a feed leaves the post in a feed context.
    app.setAttribute('pagetype', 'home');
    window.dispatchEvent(new Event('popstate'));
    expect(post.querySelector('.thread-to-llm-action')).toBeNull();

    // Navigating back into the thread re-mounts the Thread Action.
    app.setAttribute('pagetype', 'post_detail');
    window.dispatchEvent(new Event('popstate'));
    expect(post.querySelector('.thread-to-llm-action')).not.toBeNull();

    runtime.cleanup();
  });

  it('does nothing when the keyboard shortcut is triggered on a feed page', async () => {
    const shredditApp = createApp('home');
    const feed = document.createElement('shreddit-feed');
    createPost(feed, 't3_shortcut_feed');
    shredditApp.appendChild(feed);

    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const toastFn = vi.fn();
    const runtime = initialize({
      hostname: 'www.reddit.com',
      document,
      clipboard,
      toastFn,
    });

    const handled = await runtime.handleMessage({ type: 'TRIGGER_COPY_THREAD' });

    expect(handled).toBe(false);
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(toastFn).not.toHaveBeenCalled();

    runtime.cleanup();
  });
});
