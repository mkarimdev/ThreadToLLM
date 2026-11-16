// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeKeyboardCopyTrigger, findTargetPost } from '../src/extension/shortcut-handler';

describe('Shortcut & Message Handler Seam (executeKeyboardCopyTrigger)', () => {
  let clipboardMock: { writeText: ReturnType<typeof vi.fn> };
  let toastMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    clipboardMock = { writeText: vi.fn().mockResolvedValue(undefined) };
    toastMock = vi.fn();
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
});
