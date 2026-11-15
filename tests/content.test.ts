// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initialize } from '../src/extension/content';

describe('Content Script Integration Seam (initialize)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('aborts initialization and alerts user on unsupported old reddit layout', () => {
    const toastSpy = vi.fn();
    const siteTable = document.createElement('div');
    siteTable.id = 'siteTable';
    document.body.appendChild(siteTable);

    const runtime = initialize({
      hostname: 'old.reddit.com',
      document: document,
      toastFn: toastSpy,
    });

    expect(runtime.isSupported).toBe(false);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy.mock.calls[0][0]).toContain('Modern Reddit');

    runtime.cleanup();
  });

  it('alerts user with actionable guidance when shortcut is triggered on unsupported layout', async () => {
    const toastSpy = vi.fn();
    const siteTable = document.createElement('div');
    siteTable.id = 'siteTable';
    document.body.appendChild(siteTable);

    const runtime = initialize({
      hostname: 'old.reddit.com',
      document: document,
      toastFn: toastSpy,
    });

    expect(toastSpy).toHaveBeenCalledTimes(1);

    const handled = await runtime.handleMessage({ type: 'TRIGGER_COPY_THREAD' });
    expect(handled).toBe(false);
    expect(toastSpy).toHaveBeenCalledTimes(2);
    expect(toastSpy.mock.calls[1][0]).toContain('switch to modern Reddit');

    runtime.cleanup();
  });

  it('initializes SPA lifecycle manager on modern reddit and injects existing posts', () => {
    const shredditApp = document.createElement('shreddit-app');
    const post = document.createElement('shreddit-post');
    shredditApp.appendChild(post);
    document.body.appendChild(shredditApp);

    const runtime = initialize({
      hostname: 'www.reddit.com',
      document: document,
    });

    expect(runtime.isSupported).toBe(true);
    expect(post.querySelector('.thread-to-llm-action')).not.toBeNull();

    runtime.cleanup();
  });

  it('triggers copy on TRIGGER_COPY_THREAD message from background service worker', async () => {
    const shredditApp = document.createElement('shreddit-app');
    const post = document.createElement('shreddit-post');
    post.setAttribute('post-title', 'Message trigger test');
    shredditApp.appendChild(post);
    document.body.appendChild(shredditApp);

    const clipboardMock = { writeText: vi.fn().mockResolvedValue(undefined) };
    const toastMock = vi.fn();

    const runtime = initialize({
      hostname: 'www.reddit.com',
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    // Send message to listener
    const handled = await runtime.handleMessage({ type: 'TRIGGER_COPY_THREAD' });

    expect(handled).toBe(true);
    expect(clipboardMock.writeText).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledTimes(1);

    runtime.cleanup();
  });

  it('suppresses TRIGGER_COPY_THREAD message when focus is inside an input', async () => {
    const shredditApp = document.createElement('shreddit-app');
    const post = document.createElement('shreddit-post');
    post.setAttribute('post-title', 'Message trigger test');
    const input = document.createElement('input');
    shredditApp.appendChild(post);
    shredditApp.appendChild(input);
    document.body.appendChild(shredditApp);
    input.focus();

    const clipboardMock = { writeText: vi.fn().mockResolvedValue(undefined) };
    const toastMock = vi.fn();

    const runtime = initialize({
      hostname: 'www.reddit.com',
      document: document,
      clipboard: clipboardMock,
      toastFn: toastMock,
    });

    const handled = await runtime.handleMessage({ type: 'TRIGGER_COPY_THREAD' });

    expect(handled).toBe(false);
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();

    runtime.cleanup();
  });
});
