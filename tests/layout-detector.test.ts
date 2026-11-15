// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectRedditLayout, notifyIfUnsupportedLayout } from '../src/extension/layout-detector';

describe('Layout Detector Seam (detectRedditLayout)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('detects "old" layout when hostname is old.reddit.com', () => {
    const layout = detectRedditLayout({
      hostname: 'old.reddit.com',
      document: document,
    });
    expect(layout).toBe('old');
  });

  it('detects "old" layout when DOM contains #siteTable or .nestedlisting', () => {
    const siteTable = document.createElement('div');
    siteTable.id = 'siteTable';
    document.body.appendChild(siteTable);

    const layout = detectRedditLayout({
      hostname: 'www.reddit.com',
      document: document,
    });
    expect(layout).toBe('old');
  });

  it('detects "legacy-redesign" layout when hostname is new.reddit.com', () => {
    const layout = detectRedditLayout({
      hostname: 'new.reddit.com',
      document: document,
    });
    expect(layout).toBe('legacy-redesign');
  });

  it('detects "legacy-redesign" layout when DOM contains #2x-container without shreddit-app', () => {
    const container = document.createElement('div');
    container.id = '2x-container';
    document.body.appendChild(container);

    const layout = detectRedditLayout({
      hostname: 'www.reddit.com',
      document: document,
    });
    expect(layout).toBe('legacy-redesign');
  });

  it('detects "modern" layout when shreddit-app or shreddit-post is present', () => {
    const shredditApp = document.createElement('shreddit-app');
    document.body.appendChild(shredditApp);

    const layout = detectRedditLayout({
      hostname: 'www.reddit.com',
      document: document,
    });
    expect(layout).toBe('modern');
  });

  describe('notifyIfUnsupportedLayout', () => {
    it('displays warning toast on old reddit and returns true', () => {
      const mockToast = vi.fn();
      const notified = notifyIfUnsupportedLayout({
        hostname: 'old.reddit.com',
        document: document,
        toastFn: mockToast,
      });

      expect(notified).toBe(true);
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast.mock.calls[0][0]).toContain('Modern Reddit');
    });

    it('displays warning toast on legacy redesign and returns true', () => {
      const mockToast = vi.fn();
      const notified = notifyIfUnsupportedLayout({
        hostname: 'new.reddit.com',
        document: document,
        toastFn: mockToast,
      });

      expect(notified).toBe(true);
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast.mock.calls[0][0]).toContain('Modern Reddit');
    });

    it('does not display toast on modern reddit and returns false', () => {
      const mockToast = vi.fn();
      const shredditApp = document.createElement('shreddit-app');
      document.body.appendChild(shredditApp);

      const notified = notifyIfUnsupportedLayout({
        hostname: 'www.reddit.com',
        document: document,
        toastFn: mockToast,
      });

      expect(notified).toBe(false);
      expect(mockToast).not.toHaveBeenCalled();
    });
  });
});
