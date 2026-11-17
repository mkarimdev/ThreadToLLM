/**
 * ThreadToLLM - Reddit Layout Detector
 * Identifies host Reddit layout (Modern shreddit vs. unsupported Old Reddit or legacy redesign).
 */

import { FEED_CONTAINER_SELECTOR, THREAD_MODAL_SELECTOR } from '../adapters';
import { showToast } from './toast';

/** Host page types whose posts are listings rather than a focal thread. */
const FEED_PAGE_TYPES = new Set(['home', 'popular', 'all', 'community']);
/** Thread permalinks always include a `/comments/{id}` segment. */
const THREAD_ROUTE_PATTERN = /(?:^|\/)comments\/[^/?#]+/i;
const REDDIT_HOST_PATTERN = /(?:^|\.)reddit\.com$/i;

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

/**
 * Returns true only when `post` anchors a hydrated discussion thread rather than a feed card.
 *
 * A post rendered inside a modal overlay is always eligible (thread over a feed). Otherwise,
 * feed containers and feed page types are rejected. When the host page type is absent, the URL
 * is consulted only on Reddit itself so host-agnostic DOM consumers are not misclassified.
 */
export function isThreadPost(post: HTMLElement | null | undefined, doc?: Document): boolean {
  if (!post) {
    return false;
  }

  if (post.closest(THREAD_MODAL_SELECTOR)) {
    return true;
  }

  if (post.closest(FEED_CONTAINER_SELECTOR)) {
    return false;
  }

  const pageType = resolvePageType(post, doc);
  if (pageType !== null) {
    return !FEED_PAGE_TYPES.has(pageType);
  }

  const location = doc?.defaultView?.location ?? (typeof window !== 'undefined' ? window.location : undefined);
  if (!location || !REDDIT_HOST_PATTERN.test(location.hostname)) {
    return true;
  }

  return THREAD_ROUTE_PATTERN.test(location.pathname);
}

function resolvePageType(post: HTMLElement, doc?: Document): string | null {
  const app = post.closest('shreddit-app') ?? doc?.querySelector('shreddit-app');
  if (!app) {
    return null;
  }
  const value = app.getAttribute('pagetype') ?? app.getAttribute('page-type');
  return value?.trim().toLowerCase() ?? null;
}

/**
 * Silently classifies whether the host page uses an unsupported layout.
 * Callers that only need the capability check (e.g. page-load initialization) use this
 * to avoid surfacing a toast before the user has actually triggered the extension.
 */
export function isUnsupportedLayout(context?: LayoutContext): boolean {
  const layout = detectRedditLayout(context);
  return layout === 'old' || layout === 'legacy-redesign';
}

export function notifyIfUnsupportedLayout(options?: NotifyLayoutOptions): boolean {
  if (!isUnsupportedLayout(options)) {
    return false;
  }
  const toastFn = options?.toastFn ?? showToast;
  toastFn(
    'ThreadToLLM requires Modern Reddit (shreddit). Please switch to modern Reddit (www.reddit.com) to extract threads.',
    { type: 'warning', durationMs: 6000 }
  );
  return true;
}
