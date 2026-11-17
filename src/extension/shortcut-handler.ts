/**
 * ThreadToLLM - Keyboard Shortcut Trigger Handler
 * Handles keyboard shortcut copying with input focus suppression and subtle toast feedback (ADR-0003, ADR-0008).
 */

import {
  RedditAdapter,
  PlatformAdapter,
  THREAD_MODAL_SELECTOR,
  findThreadRoot,
} from '../adapters';
import { FilterPipeline, MarkdownSerializer, countComments } from '../core';
import { getDeepActiveElement, isEditableElement } from './focus-guard';
import { isThreadPost } from './layout-detector';
import { showToast } from './toast';

export interface ShortcutTriggerOptions {
  document?: Document;
  clipboard?: { writeText: (text: string) => Promise<void> };
  toastFn?: typeof showToast;
  adapter?: PlatformAdapter;
  filterPipeline?: FilterPipeline;
  serializer?: MarkdownSerializer;
}

const MAIN_THREAD_SELECTOR =
  'main, #main-content, shreddit-app[page-type="post"], shreddit-app[pagetype="post_detail"]';

/**
 * Finds a hydrated thread post, prioritizing active modal/dialog overlays over background feeds.
 * Feed summary cards are never valid targets, so shortcuts on feed surfaces do nothing.
 */
export function findTargetPost(doc: Document): HTMLElement | null {
  const posts = Array.from(doc.querySelectorAll<HTMLElement>('shreddit-post')).filter((post) =>
    isThreadPost(post, doc)
  );

  return (
    posts.find((post) => post.closest(THREAD_MODAL_SELECTOR)) ??
    posts.find((post) => post.closest(MAIN_THREAD_SELECTOR)) ??
    posts[0] ??
    null
  );
}

export async function executeKeyboardCopyTrigger(
  options?: ShortcutTriggerOptions
): Promise<boolean> {
  const doc = options?.document ?? (typeof document !== 'undefined' ? document : undefined);
  if (!doc) {
    return false;
  }

  // Guard against hijacking user keystrokes when editing text
  const activeElement = getDeepActiveElement(doc);
  if (isEditableElement(activeElement)) {
    return false;
  }

  const post = findTargetPost(doc);
  if (!post) {
    return false;
  }

  const toastFn = options?.toastFn ?? showToast;

  try {
    const adapter = options?.adapter ?? new RedditAdapter();
    const filterPipeline = options?.filterPipeline ?? new FilterPipeline();
    const serializer = options?.serializer ?? new MarkdownSerializer();

    const root = findThreadRoot(post);

    const rawDocument = adapter.extract(root);
    const filteredDocument = filterPipeline.filter(rawDocument);
    const serializedMarkdown = serializer.serialize(filteredDocument);

    const clipboard =
      options?.clipboard ??
      (typeof navigator !== 'undefined' ? navigator.clipboard : undefined);

    if (!clipboard || typeof clipboard.writeText !== 'function') {
      throw new Error('Clipboard API is not available');
    }

    await clipboard.writeText(serializedMarkdown);

    const count = countComments(filteredDocument.comments);
    toastFn(`Copied ${count} comments to clipboard!`, { type: 'success' });

    return true;
  } catch {
    toastFn('Failed to copy thread', { type: 'error' });
    return false;
  }
}
