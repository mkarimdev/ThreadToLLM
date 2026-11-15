/**
 * ThreadToLLM - Reddit Extract and Serialize Seam
 * End-to-end integration combining RedditAdapter, FilterPipeline, and MarkdownSerializer (ADR-0001, ADR-0004, ADR-0006).
 */

import { FilterPipeline, MarkdownSerializer } from '../../core';
import { RedditAdapter } from './reddit.adapter';

/**
 * High-level testing and integration seam that extracts a Modern Reddit discussion thread from DOM,
 * applies noise filtering, and serializes the result into token-dense Markdown.
 *
 * @param domRoot The DOM root containing <shreddit-post> and <shreddit-comment> elements.
 * @returns Token-dense formatted Markdown with YAML frontmatter.
 */
export async function extractAndSerialize(
  domRoot: HTMLElement | Document | Element
): Promise<string> {
  const adapter = new RedditAdapter();
  const filterPipeline = new FilterPipeline();
  const serializer = new MarkdownSerializer();

  const rawDocument = adapter.extract(domRoot);
  const filteredDocument = filterPipeline.filter(rawDocument);
  return serializer.serialize(filteredDocument);
}
