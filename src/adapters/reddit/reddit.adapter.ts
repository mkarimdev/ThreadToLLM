/**
 * ThreadToLLM - Reddit Adapter
 * Client-side DOM extraction adapter for Modern Reddit custom elements (<shreddit-post>, <shreddit-comment>) (ADR-0001, ADR-0004, ADR-0006).
 */

import { ThreadDocument, ThreadMetadata, OriginalPost, CommentNode, countComments } from '../../core';
import { PlatformAdapter } from '../adapter.interface';

/**
 * Resolves the root discussion container for a given Reddit post element.
 */
export function findThreadRoot(
  postElement: Element,
  domRoot?: HTMLElement | Document | Element
): HTMLElement | Document | Element {
  return (
    domRoot ??
    postElement.closest('shreddit-app, main') ??
    postElement.parentElement ??
    postElement.ownerDocument ??
    postElement
  );
}

export class RedditAdapter implements PlatformAdapter {
  public extract(domRoot: HTMLElement | Document | Element): ThreadDocument {
    const postEl = this.findPostElement(domRoot);
    if (!postEl) {
      throw new Error('Failed to locate <shreddit-post> in DOM root');
    }

    const originalPost = this.extractOriginalPost(postEl);
    const comments = this.extractCommentTree(domRoot, originalPost.author);
    const extractedCount = countComments(comments);
    const isPartiallyLoaded = this.detectPartialLoad(domRoot, postEl, extractedCount);

    const metadata: ThreadMetadata = {
      source: 'reddit',
      title: originalPost.title,
      url: this.resolveRedditUrl(postEl.getAttribute('permalink') || ''),
      author: originalPost.author,
      extractedCount,
      isPartiallyLoaded,
    };

    return {
      metadata,
      originalPost,
      comments,
    };
  }

  private detectPartialLoad(
    domRoot: HTMLElement | Document | Element,
    postEl: Element,
    extractedCount: number
  ): boolean {
    const unhydratedSelectors = [
      'shreddit-comment-tree-action',
      'faceplate-partial',
      'shreddit-async-loader',
      'shreddit-loading',
      'shreddit-more-comments',
      'more-comments',
    ];

    try {
      const hasUnhydratedElement = Boolean(
        domRoot.querySelector(unhydratedSelectors.join(','))
      );
      if (hasUnhydratedElement) {
        return true;
      }
    } catch {
      // Ignore query selector error if custom pseudo/selector isn't supported in all engines
    }

    const rawCommentCount = postEl.getAttribute('comment-count');
    if (rawCommentCount !== null) {
      const commentCount = parseInt(rawCommentCount, 10);
      if (!isNaN(commentCount) && extractedCount < commentCount) {
        return true;
      }
    }

    return false;
  }

  private extractCommentTree(
    domRoot: HTMLElement | Document | Element,
    opAuthor: string
  ): CommentNode[] {
    const commentEls = Array.from(domRoot.querySelectorAll('shreddit-comment'));
    if (commentEls.length === 0) {
      return [];
    }

    interface StackEntry {
      depth: number;
      node: CommentNode;
    }

    const stack: StackEntry[] = [];
    const rootComments: CommentNode[] = [];

    for (const el of commentEls) {
      const node = this.extractCommentNode(el, opAuthor);

      while (stack.length > 0 && stack[stack.length - 1].depth >= (node.depth ?? 0)) {
        stack.pop();
      }

      if (stack.length === 0) {
        rootComments.push(node);
      } else {
        stack[stack.length - 1].node.replies.push(node);
      }

      stack.push({ depth: node.depth ?? 0, node });
    }

    return rootComments;
  }

  private extractTextContent(container: Element | null, selfCommentEl?: Element): string {
    if (!container) {
      return '';
    }

    const paragraphs = Array.from(container.querySelectorAll('p'))
      .filter((p) => !selfCommentEl || p.closest('shreddit-comment') === selfCommentEl)
      .map((p) => p.textContent?.trim() || '')
      .filter((t) => t.length > 0);

    return paragraphs.length > 0 ? paragraphs.join('\n\n') : container.textContent?.trim() || '';
  }

  private extractCommentNode(el: Element, opAuthor: string): CommentNode {
    const id = el.getAttribute('thingid') || el.getAttribute('id') || '';
    let author =
      el.getAttribute('author') ||
      el.querySelector('[slot="authorName"]')?.textContent?.trim() ||
      '';

    const rawScore = el.getAttribute('score');
    const score = rawScore !== null ? parseInt(rawScore, 10) || 0 : 0;

    let depth: number;
    const depthAttr = el.getAttribute('depth');
    if (depthAttr !== null && !isNaN(parseInt(depthAttr, 10))) {
      depth = parseInt(depthAttr, 10);
    } else {
      let parent = el.parentElement;
      let count = 0;
      while (parent) {
        if (parent.tagName.toLowerCase() === 'shreddit-comment') {
          count++;
        }
        parent = parent.parentElement;
      }
      depth = count;
    }

    const commentSlot =
      el.querySelector('[slot="comment"]') ||
      el.querySelector('[id*="-comment-rtjson-content"]') ||
      el.querySelector('.md');

    let content = this.extractTextContent(commentSlot, el);
    const mediaUrl = this.extractCommentMedia(el);
    if (mediaUrl) {
      if (!content) {
        content = mediaUrl;
      } else if (!content.includes(mediaUrl)) {
        content = `${content}\n\n${mediaUrl}`;
      }
    }

    const isExplicitlyDeleted =
      el.hasAttribute('deleted') ||
      el.getAttribute('deleted') === 'true' ||
      content === '[deleted]' ||
      content === '[removed]';

    let isDeleted = false;
    if (isExplicitlyDeleted) {
      isDeleted = true;
      content = '[deleted]';
      if (!author) {
        author = '[deleted]';
      }
    } else if (!author) {
      author = '[deleted]';
    }

    const isAuthorAttr = el.getAttribute('is-author') || el.getAttribute('author-is-op');
    const isOp =
      !isDeleted &&
      (isAuthorAttr === 'true' ||
        isAuthorAttr === '' ||
        (Boolean(author) && Boolean(opAuthor) && author === opAuthor));

    return {
      id,
      author,
      content,
      score,
      depth,
      replies: [],
      ...(isOp ? { isOp: true } : {}),
      ...(isDeleted ? { isDeleted: true } : {}),
    };
  }

  private isAvatarOrIgnoredElement(mediaEl: Element, commentEl: Element): boolean {
    if (mediaEl.closest('shreddit-comment') !== commentEl) {
      return true;
    }

    const alt = mediaEl.getAttribute('alt');
    if (alt && /avatar/i.test(alt)) {
      return true;
    }

    const ariaLabel = mediaEl.getAttribute('aria-label');
    if (ariaLabel && /avatar/i.test(ariaLabel)) {
      return true;
    }

    let curr: Element | null = mediaEl;
    while (curr && curr !== commentEl) {
      const slot = curr.getAttribute('slot');
      if (
        slot === 'avatar' ||
        slot === 'authorAvatar' ||
        slot === 'authorName' ||
        slot === 'author' ||
        slot === 'flair' ||
        slot === 'user-icon' ||
        slot === 'credit-bar' ||
        slot === 'action-row' ||
        slot === 'actions'
      ) {
        return true;
      }

      const tagName = curr.tagName.toLowerCase();
      if (
        tagName === 'shreddit-avatar' ||
        tagName === 'shreddit-comment-action-row' ||
        tagName === 'button'
      ) {
        return true;
      }

      const testId = curr.getAttribute('data-testid');
      if (testId && /avatar/i.test(testId)) {
        return true;
      }

      const className = curr.className;
      if (
        typeof className === 'string' &&
        /(?:^|\s|-|_)(avatar|user-icon|flair)(?:$|\s|-|_)/i.test(className)
      ) {
        return true;
      }

      curr = curr.parentElement;
    }

    return false;
  }

  private extractCommentMedia(commentEl: Element): string | undefined {
    const mediaEls = Array.from(commentEl.querySelectorAll('img, faceplate-img'));
    if (mediaEls.length === 0) {
      return undefined;
    }

    const mediaUrls: string[] = [];
    for (const mediaEl of mediaEls) {
      if (this.isAvatarOrIgnoredElement(mediaEl, commentEl)) {
        continue;
      }

      let src = mediaEl.getAttribute('src');
      if (!src || src.startsWith('data:')) {
        src = mediaEl.getAttribute('data-src');
      }

      if (src && !mediaUrls.includes(src)) {
        mediaUrls.push(src);
      }
    }

    if (mediaUrls.length === 0) {
      return undefined;
    }
    if (mediaUrls.length === 1) {
      return mediaUrls[0];
    }
    return mediaUrls.join('\n');
  }

  private findPostElement(domRoot: HTMLElement | Document | Element): Element | null {
    if ('tagName' in domRoot && domRoot.tagName.toLowerCase() === 'shreddit-post') {
      return domRoot;
    }
    return domRoot.querySelector('shreddit-post');
  }

  private resolveRedditUrl(pathOrUrl: string): string {
    if (!pathOrUrl) {
      return '';
    }
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `https://reddit.com${cleanPath}`;
  }

  private extractOriginalPost(postEl: Element): OriginalPost {
    const id = postEl.getAttribute('id') || '';
    const title =
      postEl.getAttribute('post-title') ||
      postEl.getAttribute('post_title') ||
      postEl.querySelector('[slot="title"]')?.textContent?.trim() ||
      postEl.querySelector('h1')?.textContent?.trim() ||
      '';

    const author =
      postEl.getAttribute('author') ||
      postEl.querySelector('[slot="authorName"]')?.textContent?.trim() ||
      '';

    const rawScore = postEl.getAttribute('score');
    const score = rawScore !== null ? parseInt(rawScore, 10) : undefined;
    const createdAt = postEl.getAttribute('created-timestamp') || undefined;

    const textBodyEl =
      postEl.querySelector('[slot="text-body"]') ||
      postEl.querySelector('[id*="-post-rtjson-content"]') ||
      postEl.querySelector('.text-neutral-content');

    let content = this.extractTextContent(textBodyEl);
    const externalUrl = this.extractExternalOrMediaUrl(postEl);

    if (externalUrl) {
      if (!content) {
        content = externalUrl;
      } else if (!content.includes(externalUrl)) {
        content = `${content}\n\n${externalUrl}`;
      }
    }

    return {
      id,
      title,
      author,
      content,
      url: externalUrl,
      score,
      createdAt,
    };
  }

  private extractExternalOrMediaUrl(postEl: Element): string | undefined {
    const permalink = postEl.getAttribute('permalink') || '';
    const contentHref = postEl.getAttribute('content-href');
    if (contentHref && contentHref !== permalink && !contentHref.endsWith(permalink)) {
      return contentHref;
    }

    const outboundLink =
      postEl.querySelector('a[slot="content"]') ||
      postEl.querySelector('a[data-testid="outbound-link"]') ||
      postEl.querySelector('a.styled-outbound-link');
    if (outboundLink) {
      const href = outboundLink.getAttribute('href');
      if (href) return href;
    }

    const imgEls = Array.from(
      postEl.querySelectorAll('[slot="content"] img, shreddit-aspect-ratio img, img[src*="redd.it"]')
    );
    if (imgEls.length > 0) {
      const srcs = imgEls
        .map((img) => img.getAttribute('src'))
        .filter((src): src is string => Boolean(src));
      if (srcs.length === 1) {
        return srcs[0];
      }
      if (srcs.length > 1) {
        return srcs.join('\n');
      }
    }

    const videoEl =
      postEl.querySelector('shreddit-player') ||
      postEl.querySelector('[slot="content"] video') ||
      postEl.querySelector('video');
    if (videoEl) {
      const src = videoEl.getAttribute('src');
      if (src) return src;
    }

    return undefined;
  }
}
