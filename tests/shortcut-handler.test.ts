// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { showToast } from '../src/extension/toast';
import { executeKeyboardCopyTrigger, findTargetPost } from '../src/extension/shortcut-handler';

type WriteTextMock = ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;
type ToastMock = ReturnType<typeof vi.fn<typeof showToast>>;

describe('Shortcut & Message Handler Seam (executeKeyboardCopyTrigger)', () => {
  let clipboardMock: { writeText: WriteTextMock };
  let toastMock: ToastMock;

  beforeEach(() => {
    document.body.innerHTML = '';
    clipboardMock = { writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined) };
    toastMock = vi.fn<typeof showToast>();
  });

  it('suppresses copy when activeElement is an input', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const handled = await executeKeyboardCopyTrigger({
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(false);
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('suppresses copy when activeElement is a textarea', async () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const handled = await executeKeyboardCopyTrigger({
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(false);
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('suppresses copy when activeElement is contenteditable', async () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);
    editable.focus();

    const handled = await executeKeyboardCopyTrigger({
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(false);
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('extracts thread, writes to clipboard, and renders subtle toast on success when focus is not editable', async () => {
    const post = document.createElement('shreddit-post');
    post.setAttribute('post-title', 'Keyboard shortcut test');
    post.setAttribute('author', 'shortcutUser');
    post.setAttribute('score', '42');
    post.setAttribute('id', 't3_shortcut123');

    const comment = document.createElement('shreddit-comment');
    comment.setAttribute('author', 'commenter1');
    comment.setAttribute('score', '10');
    comment.setAttribute('depth', '0');
    comment.setAttribute('thingid', 't1_c1');
    const commentBody = document.createElement('div');
    commentBody.setAttribute('slot', 'comment');
    commentBody.innerHTML = '<p>Great post!</p>';
    comment.appendChild(commentBody);

    document.body.appendChild(post);
    document.body.appendChild(comment);

    const handled = await executeKeyboardCopyTrigger({
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(true);
    expect(clipboardMock.writeText).toHaveBeenCalledTimes(1);
    const copiedText = clipboardMock.writeText.mock.calls[0][0];
    expect(copiedText).toContain('Keyboard shortcut test');
    expect(copiedText).toContain('commenter1');

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0]).toContain('Copied 1 comments to clipboard!');
  });

  it('handles scenario when no post exists on page without throwing', async () => {
    const handled = await executeKeyboardCopyTrigger({
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(false);
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('findTargetPost returns no target on a feed listing', () => {
    const app = document.createElement('shreddit-app');
    app.setAttribute('pagetype', 'home');
    const feed = document.createElement('shreddit-feed');
    const feedPost = document.createElement('shreddit-post');
    feed.appendChild(feedPost);
    app.appendChild(feed);
    document.body.appendChild(app);

    expect(findTargetPost(document)).toBeNull();
  });

  it('findTargetPost prefers the focal thread post over recommendation feed cards', () => {
    const app = document.createElement('shreddit-app');
    app.setAttribute('pagetype', 'post_detail');
    const focalPost = document.createElement('shreddit-post');
    app.appendChild(focalPost);

    const recommendations = document.createElement('shreddit-feed');
    const recommendedPost = document.createElement('shreddit-post');
    recommendations.appendChild(recommendedPost);
    app.appendChild(recommendations);
    document.body.appendChild(app);

    expect(findTargetPost(document)).toBe(focalPost);
  });

  it('does not copy anything when the trigger fires on a feed listing', async () => {
    const app = document.createElement('shreddit-app');
    app.setAttribute('pagetype', 'all');
    const feed = document.createElement('shreddit-feed');
    const feedPost = document.createElement('shreddit-post');
    feedPost.setAttribute('post-title', 'Feed card');
    feed.appendChild(feedPost);
    app.appendChild(feed);
    document.body.appendChild(app);

    const handled = await executeKeyboardCopyTrigger({
      document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(false);
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('prioritizes post inside modal/dialog over background feed posts', async () => {
    const feedPost = document.createElement('shreddit-post');
    feedPost.setAttribute('post-title', 'Feed Post');
    feedPost.setAttribute('author', 'feedUser');
    feedPost.setAttribute('score', '1');
    document.body.appendChild(feedPost);

    const modal = document.createElement('faceplate-modal');
    const modalPost = document.createElement('shreddit-post');
    modalPost.setAttribute('post-title', 'Modal Post Title');
    modalPost.setAttribute('author', 'modalUser');
    modalPost.setAttribute('score', '10');
    modal.appendChild(modalPost);
    document.body.appendChild(modal);

    const handled = await executeKeyboardCopyTrigger({
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(true);
    const copiedText = clipboardMock.writeText.mock.calls[0][0];
    expect(copiedText).toContain('Modal Post Title');
    expect(copiedText).not.toContain('Feed Post');
  });

  it('copies the active modal thread when a feed post precedes the modal inside shreddit-app', async () => {
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

    const handled = await executeKeyboardCopyTrigger({
      document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(true);
    const copiedText = clipboardMock.writeText.mock.calls[0][0];
    expect(copiedText).toContain('Active Modal Discussion');
    expect(copiedText).toContain('Modal-only comment.');
    expect(copiedText).not.toContain('Background Feed Card');
  });

  it('renders an error toast when the clipboard write fails', async () => {
    document.body.appendChild(createThreadPost());
    clipboardMock.writeText.mockRejectedValue(new Error('Clipboard denied'));

    const handled = await executeKeyboardCopyTrigger({
      document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    expect(handled).toBe(false);
    expectErrorToast(toastMock);
  });

  it('renders an error toast when thread extraction fails', async () => {
    document.body.appendChild(createThreadPost());
    const failingAdapter = {
      extract: vi.fn(() => {
        throw new Error('Extraction failed');
      }),
    };

    const handled = await executeKeyboardCopyTrigger({
      document,
      clipboard: clipboardMock,
      toastFn: toastMock,
      adapter: failingAdapter,
    });

    expect(handled).toBe(false);
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
    expectErrorToast(toastMock);
  });

  it('renders an error toast when the Clipboard API is unavailable', async () => {
    document.body.appendChild(createThreadPost());
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      const handled = await executeKeyboardCopyTrigger({ document, toastFn: toastMock });

      expect(handled).toBe(false);
      expectErrorToast(toastMock);
    } finally {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });
});

function expectErrorToast(toastMock: ToastMock): void {
  expect(toastMock).toHaveBeenCalledWith(expect.stringContaining('Failed to copy'), {
    type: 'error',
  });
}

function createThreadPost(): HTMLElement {
  const post = document.createElement('shreddit-post');
  post.setAttribute('id', 't3_failure_case');
  post.setAttribute('post-title', 'Failure case thread');
  post.setAttribute('author', 'failureUser');
  post.setAttribute('score', '1');
  return post;
}
