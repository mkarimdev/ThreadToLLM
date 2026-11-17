/**
 * ThreadToLLM - Modern Reddit DOM Selectors
 * Shared host-element selectors used by both the Reddit Adapter and Platform UI (ADR-0006).
 */

/** Containers that render feed summary cards instead of a hydrated discussion thread. */
export const FEED_CONTAINER_SELECTOR = 'shreddit-feed, [role="feed"]';

/** Focused thread overlays rendered above a feed surface. */
export const THREAD_MODAL_SELECTOR =
  'faceplate-modal, shreddit-post-dialog, dialog[open], [role="dialog"]';
