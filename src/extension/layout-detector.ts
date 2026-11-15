/**
 * ThreadToLLM - Reddit Layout Detector
 * Identifies host Reddit layout (Modern shreddit vs. unsupported Old Reddit or legacy redesign).
 */

import { showToast } from './toast';

export type RedditLayoutType = 'modern' | 'old' | 'legacy-redesign' | 'unknown';

export interface LayoutContext {
  hostname?: string;
  document?: Document;
}

export interface NotifyLayoutOptions extends LayoutContext {
  toastFn?: typeof showToast;
}

export function detectRedditLayout(context?: LayoutContext): RedditLayoutType {
  const hostname =
    context?.hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : '');
  const doc =
    context?.document ??
    (typeof document !== 'undefined' ? document : undefined);

  if (hostname === 'old.reddit.com') {
    return 'old';
  }

  if (hostname === 'new.reddit.com') {
    return 'legacy-redesign';
  }

  if (doc) {
    if (doc.querySelector('#siteTable, .nestedlisting, body.retro-layout')) {
      return 'old';
    }

    if (doc.querySelector('shreddit-app, shreddit-post')) {
      return 'modern';
    }

    if (doc.querySelector('[id="2x-container"], div[data-testid="post-container"]')) {
      return 'legacy-redesign';
    }
  }

  return 'modern';
}

export function notifyIfUnsupportedLayout(options?: NotifyLayoutOptions): boolean {
  const layout = detectRedditLayout(options);
  if (layout === 'old' || layout === 'legacy-redesign') {
    const toastFn = options?.toastFn ?? showToast;
    toastFn(
      'ThreadToLLM requires Modern Reddit (shreddit). Please switch to modern Reddit (www.reddit.com) to extract threads.',
      { type: 'warning', durationMs: 6000 }
    );
    return true;
  }
  return false;
}
