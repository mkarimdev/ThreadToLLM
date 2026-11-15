/**
 * ThreadToLLM - Markdown Serializer
 * Serializes canonical ThreadDocument into token-dense Markdown with YAML frontmatter (ADR-0002, ADR-0005).
 */

import { ThreadDocument, CommentNode } from './types';

/**
 * Safely format a scalar value for YAML frontmatter.
 * Strings that could be ambiguous in YAML (numbers, booleans, null, or containing special chars) are quoted.
 */
function formatYamlScalar(value: string | number | boolean): string {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  // Reserved YAML 1.2 boolean/null literals that must be quoted if string
  const isReservedKeyword = /^(true|false|yes|no|on|off|null|~)$/i.test(value);
  // Pure numbers or values starting with digits/hyphens/plus must be quoted
  const isNumericOrAmbiguous = /^[-+]?\d+/.test(value);

  // If it starts with an alpha character, contains only safe word chars/dashes, and isn't reserved
  if (!isReservedKeyword && !isNumericOrAmbiguous && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

/**
 * Formats vote score into compact badge representation (+N, -N, or 0).
 */
function formatScoreBadge(score: number): string {
  if (score > 0) {
    return `+${score}`;
  }
  return String(score);
}

/**
 * Determines whether a comment author is the Original Poster (OP).
 */
function isOpAuthor(comment: CommentNode, opAuthor: string): boolean {
  if (comment.isDeleted || comment.author === '[deleted]') {
    return false;
  }
  if (comment.isOp !== undefined) {
    return comment.isOp;
  }
  if (!comment.author) {
    return false;
  }
  return Boolean(opAuthor && comment.author === opAuthor);
}

/**
 * Serializes a single CommentNode and its child replies recursively.
 */
function serializeCommentNode(
  comment: CommentNode,
  opAuthor: string,
  depth: number = 0
): string[] {
  const lines: string[] = [];
  const indent = '  '.repeat(depth);
  const scoreStr = formatScoreBadge(comment.score);
  const isDeleted = Boolean(comment.isDeleted);
  const author = isDeleted ? '[deleted]' : (comment.author || 'anonymous');
  const isOp = isOpAuthor(comment, opAuthor);
  const authorStr = isOp ? `${author} (OP)` : author;
  const rawContent = isDeleted && (!comment.content || comment.content.trim() === '')
    ? '[deleted]'
    : comment.content.trim();

  const bulletPrefix = `${indent}- **[${scoreStr}] ${authorStr}**: `;
  const continuationIndent = `${indent}  `;

  // Format content lines with proper markdown indentation for multiline comments
  const contentLines = rawContent.split('\n');
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    if (i === 0) {
      lines.push(`${bulletPrefix}${line}`);
    } else if (line.trim() === '') {
      lines.push('');
    } else {
      lines.push(`${continuationIndent}${line}`);
    }
  }

  if (comment.replies && comment.replies.length > 0) {
    for (const reply of comment.replies) {
      lines.push(...serializeCommentNode(reply, opAuthor, depth + 1));
    }
  }

  return lines;
}

export class MarkdownSerializer {
  /**
   * Serializes a ThreadDocument into token-dense Markdown.
   */
  public serialize(doc: ThreadDocument): string {
    const lines: string[] = [];

    // YAML Frontmatter
    lines.push('---');
    lines.push(`source: ${formatYamlScalar(doc.metadata.source)}`);
    lines.push(`title: ${formatYamlScalar(doc.metadata.title)}`);
    lines.push(`url: ${formatYamlScalar(doc.metadata.url)}`);
    lines.push(`author: ${formatYamlScalar(doc.metadata.author)}`);
    if (doc.metadata.isPartiallyLoaded) {
      lines.push('isPartiallyLoaded: true');
    }
    lines.push('---');

    // Original Post
    const title = doc.originalPost.title || doc.metadata.title;
    if (title) {
      lines.push('');
      lines.push(`# ${title}`);
    }

    const postContent = doc.originalPost.content ? doc.originalPost.content.trim() : '';
    if (postContent) {
      lines.push('');
      lines.push(postContent);
    }

    // Comments Tree
    if (doc.comments && doc.comments.length > 0) {
      lines.push('');
      const opAuthor = doc.originalPost.author || doc.metadata.author;
      for (const comment of doc.comments) {
        lines.push(...serializeCommentNode(comment, opAuthor, 0));
      }
    }

    return lines.join('\n');
  }
}

