/**
 * ThreadToLLM - Platform Adapter Interface
 * Contract for extracting discussion threads from host platform DOM into a ThreadDocument (ADR-0006).
 */

import { ThreadDocument } from '../core';

export interface PlatformAdapter {
  /**
   * Parses the host platform DOM rooted at domRoot and produces a canonical ThreadDocument.
   *
   * @param domRoot The root element or document containing the thread elements.
   * @returns Canonical ThreadDocument representation.
   */
  extract(domRoot: HTMLElement | Document | Element): ThreadDocument;
}
