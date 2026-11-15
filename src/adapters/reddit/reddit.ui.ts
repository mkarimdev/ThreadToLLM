/**
 * ThreadToLLM - Modern Reddit UI Mount and Action Trigger
 * Mounts native-styled pill button into <shreddit-post> and coordinates thread extraction and micro-feedback (ADR-0003, ADR-0006, ADR-0008).
 */

import { PlatformAdapter } from '../adapter.interface';
import { PlatformUI } from '../ui.interface';
import { RedditAdapter, findThreadRoot } from './reddit.adapter';
import { countComments, FilterPipeline, MarkdownSerializer } from '../../core';

export interface ClipboardService {
  writeText(text: string): Promise<void>;
}

export interface RedditUIOptions {
  adapter?: PlatformAdapter;
  filterPipeline?: FilterPipeline;
  serializer?: MarkdownSerializer;
  clipboard?: ClipboardService;
}

const FEEDBACK_DURATION_MS = 2500;
const BUTTON_CLASS = 'thread-to-llm-action';
const LABEL_CLASS = 'thread-to-llm-label';
const INJECTED_DATA_KEY = 'threadToLlmInjected';

const BG_DEFAULT = 'var(--color-neutral-background-weak, rgba(0, 0, 0, 0.05))';
const BG_HOVER = 'var(--color-neutral-background-hover, rgba(0, 0, 0, 0.1))';

const AI_ICON_SVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
</svg>`.trim();

export class RedditUI implements PlatformUI {
  private readonly adapter: PlatformAdapter;
  private readonly filterPipeline: FilterPipeline;
  private readonly serializer: MarkdownSerializer;
  private readonly clipboard?: ClipboardService;

  constructor(options?: RedditUIOptions) {
    this.adapter = options?.adapter ?? new RedditAdapter();
    this.filterPipeline = options?.filterPipeline ?? new FilterPipeline();
    this.serializer = options?.serializer ?? new MarkdownSerializer();
    this.clipboard = options?.clipboard;
  }

  public mountAction(
    postElement: HTMLElement,
    domRoot?: HTMLElement | Document | Element
  ): HTMLElement | null {
    if (!postElement) {
      return null;
    }

    const existingButton = postElement.querySelector<HTMLElement>(`.${BUTTON_CLASS}`);
    const shareButton = this.findShareButton(postElement);
    const container = this.findActionBarContainer(postElement);

    if (existingButton) {
      // If a share button or dedicated action bar hydrated later, relocate the button
      if (shareButton) {
        if (shareButton.nextElementSibling !== existingButton) {
          shareButton.insertAdjacentElement('afterend', existingButton);
        }
      } else if (container !== postElement && !container.contains(existingButton)) {
        container.appendChild(existingButton);
      }
      return null;
    }

    if (postElement.dataset[INJECTED_DATA_KEY] === 'true') {
      return null;
    }

    const button = this.createActionButton(postElement, domRoot);

    if (shareButton) {
      shareButton.insertAdjacentElement('afterend', button);
    } else {
      container.appendChild(button);
    }
    postElement.dataset[INJECTED_DATA_KEY] = 'true';

    return button;
  }

  private findShareButton(postElement: HTMLElement): HTMLElement | null {
    // 1. Check for modern Reddit shreddit-post-share-button custom element
    const shredditShare = postElement.querySelector<HTMLElement>('shreddit-post-share-button');
    if (shredditShare && !shredditShare.closest('[slot="credit-bar"]')) {
      return shredditShare;
    }

    // 2. Check for [aria-label="Share"] element outside slot="credit-bar"
    const shareElements = postElement.querySelectorAll<HTMLElement>('[aria-label="Share"]');
    for (const el of shareElements) {
      if (!el.closest('[slot="credit-bar"]')) {
        return el.closest<HTMLElement>('shreddit-post-share-button') ?? el;
      }
    }

    return null;
  }

  private findActionBarContainer(postElement: HTMLElement): HTMLElement {
    const actionBar =
      postElement.querySelector<HTMLElement>(
        'shreddit-post-action-bar, [slot="action-bar"]'
      ) ??
      this.findShareButton(postElement)?.parentElement ??
      postElement;

    return actionBar;
  }

  private createActionButton(
    postElement: HTMLElement,
    domRoot?: HTMLElement | Document | Element
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.setAttribute('aria-label', 'Copy thread for AI');

    // Reddit pill styling inheriting typography and proportions
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.gap = '6px';
    button.style.height = '32px';
    button.style.padding = '0 12px';
    button.style.borderRadius = '9999px';
    button.style.fontSize = '12px';
    button.style.fontWeight = '600';
    button.style.fontFamily = 'inherit';
    button.style.cursor = 'pointer';
    button.style.border = 'none';
    button.style.backgroundColor = BG_DEFAULT;
    button.style.color = 'var(--color-neutral-content-weak, #576f76)';
    button.style.userSelect = 'none';
    button.style.transition = 'background-color 0.15s ease';

    button.innerHTML = `${AI_ICON_SVG}<span class="${LABEL_CLASS}">Copy for AI</span>`;

    // Inherit Reddit hover styling
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = BG_HOVER;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = BG_DEFAULT;
    });

    let resetTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const setFeedback = (text: string) => {
      const labelEl = button.querySelector<HTMLElement>(`.${LABEL_CLASS}`);
      if (!labelEl) {
        return;
      }
      if (resetTimeoutId !== null) {
        clearTimeout(resetTimeoutId);
        resetTimeoutId = null;
      }
      labelEl.textContent = text;
      resetTimeoutId = setTimeout(() => {
        labelEl.textContent = 'Copy for AI';
        resetTimeoutId = null;
      }, FEEDBACK_DURATION_MS);
    };

    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        const copiedCount = await this.executeExtractionAndCopy(postElement, domRoot);
        setFeedback(`Copied ${copiedCount} comments!`);
      } catch {
        // Silently preserve state if error occurs
      }
    });

    return button;
  }

  private async executeExtractionAndCopy(
    postElement: HTMLElement,
    domRoot?: HTMLElement | Document | Element
  ): Promise<number> {
    const root = findThreadRoot(postElement, domRoot);

    const rawDocument = this.adapter.extract(root);
    const filteredDocument = this.filterPipeline.filter(rawDocument);
    const serializedMarkdown = this.serializer.serialize(filteredDocument);

    const clipboard =
      this.clipboard ??
      (typeof navigator !== 'undefined' ? navigator.clipboard : undefined);

    if (!clipboard || typeof clipboard.writeText !== 'function') {
      throw new Error('Clipboard API is not available');
    }

    await clipboard.writeText(serializedMarkdown);

    return countComments(filteredDocument.comments);
  }
}
