/**
 * ThreadToLLM - Modern Reddit SPA Lifecycle Manager
 * Observes dynamic DOM navigations and mounts action triggers idempotently (ADR-0003, ADR-0008).
 */

import { PlatformUI, RedditUI } from '../adapters';

export interface SPALifecycleOptions {
  ui?: PlatformUI;
  root?: Node;
}

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

    let injectedCount = 0;
    const elementRoot = this.root as Element | Document;

    // Check if the root itself is a shreddit-post
    if ('tagName' in elementRoot && (elementRoot as Element).tagName?.toLowerCase() === 'shreddit-post') {
      const mountedAction = this.ui.mountAction(elementRoot as HTMLElement);
      if (mountedAction) {
        injectedCount++;
      }
    }

    const posts = elementRoot.querySelectorAll<HTMLElement>('shreddit-post');
    posts.forEach((post) => {
      const mountedAction = this.ui.mountAction(post);
      if (mountedAction) {
        injectedCount++;
      }
    });

    return injectedCount;
  }

  private handleMutations(mutations: MutationRecord[]): void {
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
        if (el.tagName?.toLowerCase() === 'shreddit-post') {
          this.ui.mountAction(el);
        } else if (typeof el.querySelectorAll === 'function') {
          const nestedPosts = el.querySelectorAll<HTMLElement>('shreddit-post');
          nestedPosts.forEach((post) => this.ui.mountAction(post));
        }
      }
    }
  }
}
