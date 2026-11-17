// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { RedditUI } from '../src/adapters/reddit/reddit.ui';
import type { PlatformUI } from '../src/adapters/ui.interface';

describe('RedditUI', () => {
  let templateRoot: HTMLDivElement;
  let barePostTemplate: HTMLElement;
  let altPostTemplate: HTMLElement;
  let headerOnlyPostTemplate: HTMLElement;

  beforeAll(() => {
    // Parse fixtures once at beforeAll scope (CODING_STANDARDS.md)
    templateRoot = document.createElement('div');
    templateRoot.innerHTML = `
      <shreddit-post
        id="t3_p1"
        post-title="Scaling Distributed Systems"
        author="dist_expert"
        score="120"
        permalink="/r/devops/comments/p1/scaling_distributed_systems"
      >
        <div slot="credit-bar" class="header-credit-bar">
          <span class="author">dist_expert</span>
          <button aria-label="More options">...</button>
        </div>
        <div slot="text-body"><p>What are the key trade-offs in multi-region replication?</p></div>
        <div slot="action-bar" class="action-bar-container">
          <button aria-label="Upvote">Upvote</button>
          <shreddit-post-share-button>
            <button aria-label="Share">Share</button>
          </shreddit-post-share-button>
          <button aria-label="Save">Save</button>
        </div>
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="architect1" score="35" depth="0">
          <div slot="comment"><p>Consensus latency vs consistency guarantees.</p></div>
        </shreddit-comment>
        <shreddit-comment thingid="c2" author="AutoModerator" score="1" depth="0">
          <div slot="comment"><p>Automated rules reminder.</p></div>
        </shreddit-comment>
        <shreddit-comment thingid="c3" author="engineer2" score="12" depth="0">
          <div slot="comment"><p>Data locality is critical.</p></div>
        </shreddit-comment>
      </div>
    `;

    barePostTemplate = document.createElement('shreddit-post');
    barePostTemplate.setAttribute('id', 't3_bare');

    altPostTemplate = document.createElement('shreddit-post');
    altPostTemplate.setAttribute('id', 't3_alt');
    const customActionBar = document.createElement('shreddit-post-action-bar');
    customActionBar.innerHTML = `
      <button aria-label="Upvote">Upvote</button>
      <button aria-label="Share">Share</button>
      <button aria-label="Save">Save</button>
    `;
    altPostTemplate.appendChild(customActionBar);

    headerOnlyPostTemplate = document.createElement('shreddit-post');
    headerOnlyPostTemplate.setAttribute('id', 't3_header_only');
    const headerOnlyCreditBar = document.createElement('div');
    headerOnlyCreditBar.setAttribute('slot', 'credit-bar');
    headerOnlyCreditBar.innerHTML = `
      <span>Author</span>
      <button aria-label="More options">...</button>
    `;
    headerOnlyPostTemplate.appendChild(headerOnlyCreditBar);
  });

  describe('Seam 1: UI Mounting & Idempotency', () => {
    let threadRoot: HTMLDivElement;
    let postElement: HTMLElement;
    let redditUi: RedditUI;

    beforeEach(() => {
      threadRoot = templateRoot.cloneNode(true) as HTMLDivElement;
      postElement = threadRoot.querySelector('shreddit-post') as HTMLElement;
      redditUi = new RedditUI();
    });

    it('implements the PlatformUI interface', () => {
      const ui: PlatformUI = redditUi;
      expect(typeof ui.mountAction).toBe('function');
    });

    it('mounts a native-styled action button into the action bar with pill styling and SVG icon', () => {
      const button = redditUi.mountAction(postElement);

      expect(button).not.toBeNull();
      expect(button?.tagName.toLowerCase()).toBe('button');
      expect(button?.classList.contains('thread-to-llm-action')).toBe(true);

      // Verify it is placed inside the action bar container alongside Share and Save
      const actionBar = postElement.querySelector('[slot="action-bar"]');
      expect(actionBar?.contains(button)).toBe(true);

      // Verify slot="credit-bar" is NOT injected into
      const creditBar = postElement.querySelector('[slot="credit-bar"]');
      expect(creditBar?.contains(button)).toBe(false);

      // Verify SVG icon exists
      const svgIcon = button?.querySelector('svg');
      expect(svgIcon).not.toBeNull();

      // Verify default label text
      const label = button?.querySelector('.thread-to-llm-label');
      expect(label?.textContent).toBe('Copy for AI');

      // Verify pill styling attributes matching Reddit specs
      expect(button?.style.height).toBe('32px');
      expect(button?.style.borderRadius).toBe('9999px');
      expect(button?.style.padding).toBe('0px 12px');
      expect(button?.style.gap).toBe('6px');
      expect(button?.style.cursor).toBe('pointer');
      expect(button?.style.fontFamily).toBe('inherit');
      expect(button?.style.backgroundColor).toContain('var(--color-neutral-background-weak');
    });

    it('mounts directly to the right of <shreddit-post-share-button> in action bar with proper spacing', () => {
      const button = redditUi.mountAction(postElement);
      const shareButton = postElement.querySelector('shreddit-post-share-button')!;

      expect(button).not.toBeNull();
      expect(shareButton).not.toBeNull();
      expect(shareButton.nextElementSibling).toBe(button);
      expect(button?.style.marginLeft).toContain('var(--spacing-xs');
    });

    it('mounts directly to the right of button[aria-label="Share"] when custom element wrapper is absent', () => {
      const altPost = altPostTemplate.cloneNode(true) as HTMLElement;
      const shareBtn = altPost.querySelector('[aria-label="Share"]')!;

      const button = redditUi.mountAction(altPost);
      expect(button).not.toBeNull();
      expect(shareBtn.nextElementSibling).toBe(button);
    });

    it('never injects into slot="credit-bar" even when it is the only slotted container', () => {
      const headerPost = headerOnlyPostTemplate.cloneNode(true) as HTMLElement;
      const creditBar = headerPost.querySelector('[slot="credit-bar"]')!;

      const button = redditUi.mountAction(headerPost);
      expect(button).not.toBeNull();
      expect(creditBar.contains(button)).toBe(false);
      expect(headerPost.contains(button)).toBe(true);
    });

    it('applies Reddit hover styling transitions on mouseenter and mouseleave', () => {
      const button = redditUi.mountAction(postElement);
      expect(button).not.toBeNull();

      const initialBg = button?.style.backgroundColor;
      expect(initialBg).toContain('var(--color-neutral-background-weak');

      // Simulate hover
      button?.dispatchEvent(new MouseEvent('mouseenter'));
      expect(button?.style.backgroundColor).toContain('var(--color-neutral-background-hover');

      // Simulate unhover
      button?.dispatchEvent(new MouseEvent('mouseleave'));
      expect(button?.style.backgroundColor).toContain('var(--color-neutral-background-weak');
    });

    it('mounts into alternative action bar containers (e.g. shreddit-post-action-bar)', () => {
      const altPost = altPostTemplate.cloneNode(true) as HTMLElement;
      const customActionBar = altPost.querySelector('shreddit-post-action-bar')!;

      const button = redditUi.mountAction(altPost);
      expect(button).not.toBeNull();
      expect(customActionBar.contains(button)).toBe(true);
    });

    it('falls back to mounting directly into shreddit-post if no action bar container is present', () => {
      const barePost = barePostTemplate.cloneNode(true) as HTMLElement;
      const button = redditUi.mountAction(barePost);
      expect(button).not.toBeNull();
      expect(barePost.contains(button)).toBe(true);
    });

    it.each(['shreddit-feed', 'role="feed"'])(
      'refuses to mount the Thread Action on a post inside %s',
      (feedKind) => {
        const feed =
          feedKind === 'shreddit-feed'
            ? document.createElement('shreddit-feed')
            : document.createElement('div');
        if (feedKind !== 'shreddit-feed') {
          feed.setAttribute('role', 'feed');
        }
        const barePost = barePostTemplate.cloneNode(true) as HTMLElement;
        feed.appendChild(barePost);

        const button = redditUi.mountAction(barePost);

        expect(button).toBeNull();
        expect(barePost.querySelector('.thread-to-llm-action')).toBeNull();
      }
    );

    it('mounts on a post inside a focused thread modal even when a feed is an ancestor', () => {
      const feed = document.createElement('shreddit-feed');
      const modal = document.createElement('faceplate-modal');
      const barePost = barePostTemplate.cloneNode(true) as HTMLElement;
      modal.appendChild(barePost);
      feed.appendChild(modal);

      const button = redditUi.mountAction(barePost);

      expect(button).not.toBeNull();
      expect(barePost.querySelector('.thread-to-llm-action')).not.toBeNull();
    });

    it('re-mounts when a stale injected marker remains after its action was removed', () => {
      const barePost = barePostTemplate.cloneNode(true) as HTMLElement;
      const firstButton = redditUi.mountAction(barePost);
      expect(firstButton).not.toBeNull();

      firstButton!.remove();
      const secondButton = redditUi.mountAction(barePost);

      expect(secondButton).not.toBeNull();
      expect(barePost.querySelectorAll('.thread-to-llm-action')).toHaveLength(1);
    });

    it('calls findShareButton exactly once during mountAction to prevent redundant traversals', () => {
      const spy = vi.spyOn(redditUi as unknown as { findShareButton: (el: HTMLElement) => HTMLElement | null }, 'findShareButton');
      const altPost = altPostTemplate.cloneNode(true) as HTMLElement;

      redditUi.mountAction(altPost);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('relocates fallback button directly to the right of Share button when action bar hydrates later', () => {
      const barePost = barePostTemplate.cloneNode(true) as HTMLElement;
      const initialButton = redditUi.mountAction(barePost);
      expect(initialButton).not.toBeNull();
      expect(barePost.contains(initialButton)).toBe(true);

      // Hydrate an action bar with share button afterwards
      const actionBar = document.createElement('shreddit-post-action-bar');
      const shareButton = document.createElement('shreddit-post-share-button');
      actionBar.appendChild(shareButton);
      barePost.appendChild(actionBar);

      // Re-trigger mountAction
      redditUi.mountAction(barePost);
      expect(actionBar.contains(initialButton)).toBe(true);
      expect(shareButton.nextElementSibling).toBe(initialButton);
      expect(barePost.querySelectorAll('.thread-to-llm-action').length).toBe(1);
    });

    it('is idempotent and prevents duplicate button injections', () => {
      const firstButton = redditUi.mountAction(postElement);
      expect(firstButton).not.toBeNull();

      // Second call should return null and not add another button
      const secondCall = redditUi.mountAction(postElement);
      expect(secondCall).toBeNull();

      const buttons = postElement.querySelectorAll('.thread-to-llm-action');
      expect(buttons.length).toBe(1);
    });
  });

  describe('Seam 2: Action Trigger & Clipboard Dispatch', () => {
    let threadRoot: HTMLDivElement;
    let postElement: HTMLElement;
    let mockClipboard: { writeText: ReturnType<typeof vi.fn> };
    let redditUi: RedditUI;

    beforeEach(() => {
      threadRoot = templateRoot.cloneNode(true) as HTMLDivElement;
      postElement = threadRoot.querySelector('shreddit-post') as HTMLElement;
      mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      redditUi = new RedditUI({ clipboard: mockClipboard });
    });

    it('extracts thread, filters noise, serializes markdown, and writes to clipboard upon button click', async () => {
      const button = redditUi.mountAction(postElement, threadRoot);
      expect(button).not.toBeNull();

      button?.click();

      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      const writtenText = mockClipboard.writeText.mock.calls[0][0];

      // Markdown content assertions
      expect(writtenText).toContain('source: reddit');
      expect(writtenText).toContain('title: "Scaling Distributed Systems"');
      expect(writtenText).toContain('author: dist_expert');
      expect(writtenText).toContain('Consensus latency vs consistency guarantees.');
      expect(writtenText).toContain('Data locality is critical.');

      // AutoModerator should be pruned by FilterPipeline
      expect(writtenText).not.toContain('AutoModerator');
    });

    it('infers domRoot from postElement parent if domRoot is omitted', async () => {
      const button = redditUi.mountAction(postElement);
      button?.click();

      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      const writtenText = mockClipboard.writeText.mock.calls[0][0];
      expect(writtenText).toContain('Consensus latency vs consistency guarantees.');
    });

    it('copies the active modal thread instead of a preceding feed card when its action is clicked', async () => {
      const app = document.createElement('shreddit-app');
      app.setAttribute('pagetype', 'home');

      const feed = document.createElement('shreddit-feed');
      const feedPost = document.createElement('shreddit-post');
      feedPost.setAttribute('id', 't3_background_feed');
      feedPost.setAttribute('post-title', 'Background Feed Card');
      feedPost.setAttribute('author', 'feedUser');
      feed.appendChild(feedPost);
      app.appendChild(feed);

      const modal = document.createElement('faceplate-modal');
      const modalPost = document.createElement('shreddit-post');
      modalPost.setAttribute('id', 't3_active_modal');
      modalPost.setAttribute('post-title', 'Active Modal Discussion');
      modalPost.setAttribute('author', 'modalUser');
      modalPost.setAttribute('score', '42');
      modalPost.setAttribute('permalink', '/r/typescript/comments/active_modal/discussion');
      modal.appendChild(modalPost);

      const comment = document.createElement('shreddit-comment');
      comment.setAttribute('thingid', 't1_modal_comment');
      comment.setAttribute('author', 'modalCommenter');
      comment.setAttribute('depth', '0');
      const commentBody = document.createElement('div');
      commentBody.setAttribute('slot', 'comment');
      commentBody.innerHTML = '<p>Modal-only comment.</p>';
      comment.appendChild(commentBody);
      modal.appendChild(comment);

      app.appendChild(modal);
      document.body.appendChild(app);

      // The button is mounted on the modal post; no explicit domRoot, as in the live extension.
      const button = redditUi.mountAction(modalPost);
      expect(button).not.toBeNull();

      button?.click();

      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      const writtenText = mockClipboard.writeText.mock.calls[0][0];
      expect(writtenText).toContain('title: "Active Modal Discussion"');
      expect(writtenText).toContain('author: modalUser');
      expect(writtenText).toContain('Modal-only comment.');
      expect(writtenText).not.toContain('Background Feed Card');

      app.remove();
    });

    it('uses navigator.clipboard.writeText by default if no custom clipboard is provided', async () => {
      const defaultUi = new RedditUI();
      const navWriteSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: navWriteSpy },
        configurable: true,
        writable: true,
      });

      const button = defaultUi.mountAction(postElement, threadRoot);
      button?.click();

      expect(navWriteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Seam 3: Micro-Feedback State Transition & Reset', () => {
    let threadRoot: HTMLDivElement;
    let postElement: HTMLElement;
    let mockClipboard: { writeText: ReturnType<typeof vi.fn> };
    let redditUi: RedditUI;

    beforeEach(() => {
      vi.useFakeTimers();

      threadRoot = templateRoot.cloneNode(true) as HTMLDivElement;
      postElement = threadRoot.querySelector('shreddit-post') as HTMLElement;
      mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      redditUi = new RedditUI({ clipboard: mockClipboard });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('transitions button label to "Copied [N] comments!" reflecting filtered comments copied', async () => {
      const button = redditUi.mountAction(postElement, threadRoot);
      const label = button?.querySelector('.thread-to-llm-label');
      expect(label?.textContent).toBe('Copy for AI');

      button?.click();
      await vi.advanceTimersByTimeAsync(100);

      // Total comments in fixture = 3 (architect1, AutoModerator, engineer2).
      // AutoModerator is filtered out, leaving 2 copied comments.
      expect(label?.textContent).toBe('Copied 2 comments!');
    });

    it('resets button label back to "Copy for AI" after exactly 2.5 seconds (2500ms)', async () => {
      const button = redditUi.mountAction(postElement, threadRoot);
      const label = button?.querySelector('.thread-to-llm-label');

      button?.click();
      await vi.advanceTimersByTimeAsync(100);
      expect(label?.textContent).toBe('Copied 2 comments!');

      // At 2400ms after click (2300ms advance), still active
      await vi.advanceTimersByTimeAsync(2300);
      expect(label?.textContent).toBe('Copied 2 comments!');

      // At 2500ms, transitions back to "Copy for AI"
      await vi.advanceTimersByTimeAsync(100);
      expect(label?.textContent).toBe('Copy for AI');
    });

    it('clears previous reset timer and restarts 2.5s window when re-clicked', async () => {
      const button = redditUi.mountAction(postElement, threadRoot);
      const label = button?.querySelector('.thread-to-llm-label');

      button?.click();
      await vi.advanceTimersByTimeAsync(1500);
      expect(label?.textContent).toBe('Copied 2 comments!');

      // Click again at 1500ms
      button?.click();
      await vi.advanceTimersByTimeAsync(100);
      expect(label?.textContent).toBe('Copied 2 comments!');

      // Advance another 1500ms (3100ms total from start, but 1600ms since 2nd click)
      await vi.advanceTimersByTimeAsync(1500);
      expect(label?.textContent).toBe('Copied 2 comments!');

      // Complete 2500ms from second click (another 900ms)
      await vi.advanceTimersByTimeAsync(900);
      expect(label?.textContent).toBe('Copy for AI');
    });

    it('does not display copied feedback if clipboard write fails', async () => {
      const failingClipboard = { writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')) };
      const failingUi = new RedditUI({ clipboard: failingClipboard });

      const button = failingUi.mountAction(postElement, threadRoot);
      const label = button?.querySelector('.thread-to-llm-label');

      button?.click();
      await vi.advanceTimersByTimeAsync(100);

      // Should not falsely claim comments were copied
      expect(label?.textContent).toBe('Copy for AI');
    });
  });
});
