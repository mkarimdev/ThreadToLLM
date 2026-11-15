/**
 * ThreadToLLM - Core Domain Types
 * Platform-agnostic canonical data models with zero DOM or browser API dependencies (ADR-0002, ADR-0009).
 */

/**
 * Platform-agnostic metadata for an extracted discussion thread.
 */
export interface ThreadMetadata {
  /** The host platform identifier (e.g. 'reddit'). */
  source: string;
  /** Title of the discussion thread. */
  title: string;
  /** Web URL of the discussion thread. */
  url: string;
  /** Username or display handle of the Original Poster. */
  author: string;
  /** Total count of comments extracted from the DOM. */
  extractedCount: number;
  /** Whether unhydrated or unexpanded comments remained when extraction occurred. */
  isPartiallyLoaded: boolean;
}

/**
 * Platform-agnostic intermediate representation of the root discussion post.
 */
export interface OriginalPost {
  /** Unique platform identifier for the post. */
  id: string;
  /** Title of the submission. */
  title: string;
  /** Author handle of the submission. */
  author: string;
  /** Text content of the post or link/media fallback URL. */
  content: string;
  /** External target URL for link posts, if applicable. */
  url?: string;
  /** Net upvote/downvote score, if available. */
  score?: number;
  /** Post creation timestamp or ISO date string. */
  createdAt?: string;
}

/**
 * Platform-agnostic recursive node in a discussion comment tree.
 */
export interface CommentNode {
  /** Unique platform identifier for the comment. */
  id: string;
  /** Author handle of the comment. */
  author: string;
  /** Text content of the comment. */
  content: string;
  /** Net vote score of the comment. */
  score: number;
  /** Recursive child replies to this comment. */
  replies: CommentNode[];
  /** Whether the comment author is the Original Poster (OP). */
  isOp?: boolean;
  /** Whether this comment was deleted/removed and retained as a placeholder. */
  isDeleted?: boolean;
  /** Hierarchical tier/depth of the comment (0 for top-level replies). */
  depth?: number;
}

/**
 * Normalized platform-agnostic intermediate representation of a full discussion thread.
 */
export interface ThreadDocument {
  metadata: ThreadMetadata;
  originalPost: OriginalPost;
  comments: CommentNode[];
}

/**
 * Counts total comments in a recursive comment tree.
 */
export function countComments(comments: CommentNode[]): number {
  let count = 0;
  const walk = (node: CommentNode) => {
    count++;
    if (node.replies) {
      node.replies.forEach(walk);
    }
  };
  comments.forEach(walk);
  return count;
}

