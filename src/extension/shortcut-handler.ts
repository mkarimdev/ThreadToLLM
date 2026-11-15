/**
 * ThreadToLLM - Keyboard Shortcut Trigger Handler
 * Handles keyboard shortcut copying with input focus suppression and subtle toast feedback (ADR-0003, ADR-0008).
 */

import { RedditAdapter, PlatformAdapter } from '../adapters';
import { FilterPipeline, MarkdownSerializer, countComments } from '../core';
import { getDeepActiveElement, isEditableElement } from './focus-guard';
import { showToast } from './toast';

export interface ShortcutTriggerOptions {
  document?: Document;
  clipboard?: { writeText: (text: string) => Promise<void> };
  toastFn?: typeof showToast;
  adapter?: PlatformAdapter;
  filterPipeline?: FilterPipeline;
  serializer?: MarkdownSerializer;
}

/**
 * Finds target post element, prioritizing active modal/dialog overlays over background feeds.
 */
export function findTargetPost(doc: Document): HTMLElement | null {
  const modalPost = doc.querySelector<HTMLElement>(
    'faceplate-modal shreddit-post, dialog shreddit-post, [role="dialog"] shreddit-post, shreddit-post-dialog shreddit-post'
  );
  if (modalPost) {
    return modalPost;
  }

  const mainPost = doc.querySelector<HTMLElement>(
    'main shreddit-post, shreddit-app[page-type="post"] shreddit-post, #main-content shreddit-post'
  );
  if (mainPost) {
    return mainPost;
  }

  return doc.querySelector<HTMLElement>('shreddit-post');
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

  try {
    const adapter = options?.adapter ?? new RedditAdapter();
    const filterPipeline = options?.filterPipeline ?? new FilterPipeline();
    const serializer = options?.serializer ?? new MarkdownSerializer();

    const root =
      post.closest('shreddit-app, main') ??
      post.parentElement ??
      post.ownerDocument ??
      post;

    const rawDocument = adapter.extract(root);
    const filteredDocument = filterPipeline.filter(rawDocument);
    const serializedMarkdown = serializer.serialize(filteredDocument);

    const clipboard =
      options?.clipboard ??
      (typeof navigator !== 'undefined' ? navigator.clipboard : undefined);

    if (!clipboard || typeof clipboard.writeText !== 'function') {
      return false;
    }

    await clipboard.writeText(serializedMarkdown);

    const count = countComments(filteredDocument.comments);
    const toastFn = options?.toastFn ?? showToast;
    toastFn(`Copied ${count} comments to clipboard!`, { type: 'success' });

    return true;
  } catch {
    return false;
  }
}
