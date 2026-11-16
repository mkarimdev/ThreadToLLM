/**
 * ThreadToLLM - Modern Reddit SPA Lifecycle Manager
 * Observes dynamic DOM navigations and mounts action triggers idempotently (ADR-0003, ADR-0008).
 */

import { PlatformUI, RedditUI } from '../adapters';
import { isThreadPost } from './layout-detector';

export interface SPALifecycleOptions {
  ui?: PlatformUI;
  root?: Node;
}

const ACTION_BAR_SELECTORS = 'shreddit-post-action-bar, [slot="action-bar"], shreddit-post-share-button';
const ACTION_BUTTON_SELECTOR = '.thread-to-llm-action';

export class SPALifecycleManager {
  private readonly ui: PlatformUI;
  private readonly root: Node;
  private observer: MutationObserver | null = null;
  private lastUrl: string = '';
  private onPopStateBound: (() => void) | null = null;

  constructor(options?: SPALifecycleOptions) {
    this.ui = options?.ui ?? new RedditUI();
    this.root = options?.root ?? (typeof document !== 'undefined' ? document.body ?? document : (null as unknown as Node));
  }

  public start(): void {
    if (!this.root) {
      return;
    }

    if (typeof window !== 'undefined') {
      this.lastUrl = window.location?.href ?? '';
      this.onPopStateBound = () => this.injectAll();
      window.addEventListener('popstate', this.onPopStateBound);
    }

    // Initial pass over existing posts
    this.injectAll();

    // Start MutationObserver for dynamically loaded posts
    if (typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });

      this.observer.observe(this.root, {
        childList: true,
        subtree: true,
      });
    }
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.onPopStateBound && typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopStateBound);
      this.onPopStateBound = null;
    }
  }

  public injectAll(): number {
    if (!this.root || !('querySelectorAll' in this.root)) {
      return 0;
    }

    this.removeIneligibleActions();

    let injectedCount = 0;
    const elementRoot = this.root as Element | Document;

    // Check if the root itself is a shreddit-post
    if ('tagName' in elementRoot && (elementRoot as Element).tagName?.toLowerCase() === 'shreddit-post') {
      if (this.mountIfEligible(elementRoot as HTMLElement)) {
        injectedCount++;
      }
    }

    const posts = elementRoot.querySelectorAll<HTMLElement>('shreddit-post');
    posts.forEach((post) => {
      if (this.mountIfEligible(post)) {
        injectedCount++;
      }
    });

    return injectedCount;
  }

  private handleMutations(mutations: MutationRecord[]): void {
    this.removeIneligibleActions();

    if (typeof window !== 'undefined' && window.location?.href !== this.lastUrl) {
      this.lastUrl = window.location.href;
      this.injectAll();
      return;
    }

    for (const mutation of mutations) {
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const node = mutation.addedNodes[i];
        if (node.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }

        const el = node as HTMLElement;
        if (el.classList?.contains('thread-to-llm-action') || el.closest?.(ACTION_BUTTON_SELECTOR)) {
          continue;
        }

        if (el.tagName?.toLowerCase() === 'shreddit-post') {
          this.mountIfEligible(el);
        } else {
          // If a dedicated action bar container is added into an existing post, re-evaluate the parent post
          const isActionBarCandidate =
            (typeof el.matches === 'function' && el.matches(ACTION_BAR_SELECTORS)) ||
            (typeof el.querySelector === 'function' && Boolean(el.querySelector(ACTION_BAR_SELECTORS)));

          if (isActionBarCandidate) {
            const parentPost = el.closest?.('shreddit-post') as HTMLElement | null;
            if (parentPost) {
              this.mountIfEligible(parentPost);
            }
          }

          if (typeof el.querySelectorAll === 'function') {
            const nestedPosts = el.querySelectorAll<HTMLElement>('shreddit-post');
            nestedPosts.forEach((post) => this.mountIfEligible(post));
          }
        }
      }
    }
  }

  /**
   * Mounts the Thread Action only on posts that anchor a hydrated thread.
   */
  private mountIfEligible(post: HTMLElement | null | undefined): HTMLElement | null {
    if (!post || !isThreadPost(post, this.resolveDocument())) {
      return null;
    }

    return this.ui.mountAction(post);
  }

  /**
   * Removes Thread Actions left behind when a post is no longer a hydrated thread
   * (e.g. SPA navigation back to a feed route, or a recommendation rail hydration).
   */
  private removeIneligibleActions(): void {
    if (!this.root || !('querySelectorAll' in this.root)) {
      return;
    }

    const doc = this.resolveDocument();
    (this.root as Element | Document)
      .querySelectorAll<HTMLElement>(ACTION_BUTTON_SELECTOR)
      .forEach((action) => {
        const post = action.closest<HTMLElement>('shreddit-post');
        if (!post || !isThreadPost(post, doc)) {
          action.remove();
        }
      });
  }

  private resolveDocument(): Document | undefined {
    if (!this.root) {
      return undefined;
    }
    const node = this.root as Node;
    if (node.nodeType === 9) {
      return node as unknown as Document;
    }
    return node.ownerDocument ?? (typeof document !== 'undefined' ? document : undefined);
  }
}
