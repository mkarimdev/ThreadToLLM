/**
 * ThreadToLLM - Filter Pipeline
 * Cleans noise (bot comments, deleted content, and excess depth) from Thread Documents (ADR-0007, ADR-0010).
 */

import { ThreadDocument, CommentNode } from '../types';

export interface FilterPipelineOptions {
  /** Maximum hierarchical depth tier to retain. Default: 3. */
  maxDepth?: number;
  /** Additional bot usernames to prune (case-insensitive). */
  botAuthors?: string[];
}

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_BOT_REGEX = /^(?:automoderator|.+[-_]bot)$/i;
const DELETED_TEXT_REGEX = /^\[(?:deleted|removed)\]$/i;

/**
 * Checks whether comment text indicates deletion or removal.
 */
function isDeletedContent(content?: string): boolean {
  if (!content) {
    return false;
  }
  return DELETED_TEXT_REGEX.test(content.trim());
}

/**
 * Determines whether a CommentNode represents deleted content.
 * Note: An author being '[deleted]' indicates an inactive/deleted user account,
 * not necessarily a deleted comment. A comment is deleted only if flagged as such
 * or if its content was purged/removed.
 */
function isDeletedComment(comment: CommentNode): boolean {
  return Boolean(comment.isDeleted || isDeletedContent(comment.content));
}

/**
 * Determines whether an author is a known bot or matches bot naming conventions.
 */
function isBotComment(comment: CommentNode, customBots?: Set<string>): boolean {
  if (!comment.author) {
    return false;
  }
  const author = comment.author.trim();
  if (customBots && customBots.has(author.toLowerCase())) {
    return true;
  }
  return DEFAULT_BOT_REGEX.test(author);
}

export class FilterPipeline {
  private readonly maxDepth: number;
  private readonly customBots?: Set<string>;

  constructor(options?: FilterPipelineOptions) {
    this.maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    if (options?.botAuthors && options.botAuthors.length > 0) {
      this.customBots = new Set(options.botAuthors.map((b) => b.toLowerCase().trim()));
    }
  }

  private filterCommentNode(comment: CommentNode, depth: number = 0): CommentNode | null {
    if (depth >= this.maxDepth) {
      return null;
    }

    if (isBotComment(comment, this.customBots)) {
      return null;
    }

    const filteredReplies: CommentNode[] = [];
    if (comment.replies && comment.replies.length > 0) {
      for (const reply of comment.replies) {
        const filteredChild = this.filterCommentNode(reply, depth + 1);
        if (filteredChild !== null) {
          filteredReplies.push(filteredChild);
        }
      }
    }

    if (isDeletedComment(comment)) {
      if (filteredReplies.length === 0) {
        return null;
      }
      return {
        ...comment,
        depth: comment.depth ?? depth,
        author: '[deleted]',
        content: '[deleted]',
        isDeleted: true,
        replies: filteredReplies,
      };
    }

    return {
      ...comment,
      depth: comment.depth ?? depth,
      replies: filteredReplies,
    };
  }

  public filter(doc: ThreadDocument): ThreadDocument {
    const filteredComments: CommentNode[] = [];

    for (const comment of doc.comments) {
      const filtered = this.filterCommentNode(comment, 0);
      if (filtered !== null) {
        filteredComments.push(filtered);
      }
    }

    return {
      metadata: { ...doc.metadata },
      originalPost: { ...doc.originalPost },
      comments: filteredComments,
    };
  }
}
