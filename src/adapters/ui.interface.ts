/**
 * ThreadToLLM - Platform UI Interface
 * Contract for mounting in-page thread action triggers and handling micro-feedback (ADR-0003, ADR-0006).
 */

export interface PlatformUI {
  /**
   * Mounts the native Thread Action button into the host platform post element.
   *
   * @param postElement The host platform post element (e.g. <shreddit-post>).
   * @param domRoot Optional root container for comment tree lookup (defaults to post's closest container/document).
   * @returns The mounted action button element, or null if injection failed or already mounted.
   */
  mountAction(postElement: HTMLElement, domRoot?: HTMLElement | Document | Element): HTMLElement | null;
}
