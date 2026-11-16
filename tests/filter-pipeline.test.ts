import { describe, it, expect } from 'vitest';
import { FilterPipeline } from '../src/core/filters';
import { MarkdownSerializer } from '../src/core/serializer';
import { ThreadDocument, CommentNode } from '../src/core/types';

function findCommentById(comments: CommentNode[], id: string): CommentNode | undefined {
  for (const comment of comments) {
    if (comment.id === id) {
      return comment;
    }
    const found = findCommentById(comment.replies, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

describe('FilterPipeline', () => {
  const baseDoc: ThreadDocument = {
    metadata: {
      source: 'reddit',
      title: 'Test Post',
      url: 'https://reddit.com/r/test/comments/123',
      author: 'op_user',
      extractedCount: 2,
      isPartiallyLoaded: false,
    },
    originalPost: {
      id: 't3_test',
      title: 'Test Post',
      author: 'op_user',
      content: 'Hello world',
    },
    comments: [],
  };

  describe('Bot Pruning', () => {
    it('prunes AutoModerator comments from the root and nested replies', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'c_bot_1',
            author: 'AutoModerator',
            content: 'Please read the subreddit rules before posting.',
            score: 1,
            replies: [],
          },
          {
            id: 'c_user_1',
            author: 'real_user',
            content: 'Great discussion topic.',
            score: 10,
            replies: [
              {
                id: 'c_bot_2',
                author: 'automoderator',
                content: 'Automated reply reminder.',
                score: 1,
                replies: [],
              },
              {
                id: 'c_user_2',
                author: 'another_user',
                content: 'I agree with this point.',
                score: 5,
                replies: [],
              },
            ],
          },
        ],
      };

      const result = pipeline.filter(doc);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('c_user_1');
      expect(result.comments[0].replies).toHaveLength(1);
      expect(result.comments[0].replies[0].id).toBe('c_user_2');
    });

    it('prunes automated bots matching naming patterns out of the box', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'c_bot_pattern',
            author: 'RemindMe_Bot',
            content: 'I will remind you in 2 days.',
            score: 3,
            replies: [],
          },
          {
            id: 'c_human',
            author: 'normal_developer',
            content: 'Useful thread.',
            score: 8,
            replies: [],
          },
        ],
      };

      const result = pipeline.filter(doc);
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('c_human');
    });

    it('prunes bot comments based on custom botAuthors option', () => {
      const pipeline = new FilterPipeline({ botAuthors: ['spam_filter'] });
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'c1',
            author: 'SPAM_FILTER',
            content: 'Beep boop',
            score: 1,
            replies: [],
          },
          {
            id: 'c2',
            author: 'normal_user',
            content: 'Hello',
            score: 5,
            replies: [],
          },
        ],
      };

      const result = pipeline.filter(doc);
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('c2');
    });
  });

  describe('Deleted Comment Pruning', () => {
    it('strips deleted leaf comments without children from the tree', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'c_deleted_leaf_1',
            author: '[deleted]',
            content: '[deleted]',
            score: 0,
            isDeleted: true,
            replies: [],
          },
          {
            id: 'c_user_1',
            author: 'active_user',
            content: 'Active top-level comment',
            score: 15,
            replies: [
              {
                id: 'c_deleted_leaf_2',
                author: 'some_user',
                content: '[removed]',
                score: 0,
                replies: [],
              },
              {
                id: 'c_active_reply',
                author: 'reply_user',
                content: 'Active child reply',
                score: 3,
                replies: [],
              },
            ],
          },
        ],
      };

      const result = pipeline.filter(doc);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('c_user_1');
      expect(result.comments[0].replies).toHaveLength(1);
      expect(result.comments[0].replies[0].id).toBe('c_active_reply');
    });

    it('preserves valid comments written by deleted accounts', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'c_deactivated_author',
            author: '[deleted]',
            content: 'This insightful comment was written by an account that is now deleted.',
            score: 45,
            replies: [],
          },
        ],
      };

      const result = pipeline.filter(doc);
      // Valid comment must not be falsely treated as deleted
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('c_deactivated_author');
      expect(result.comments[0].content).toContain('insightful comment');
    });

    it('retains deleted parent comments with active child replies as minimalist placeholders', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'c_deleted_parent',
            author: 'former_user',
            content: '[deleted]',
            score: 5,
            isDeleted: true,
            replies: [
              {
                id: 'c_child_reply',
                author: 'responding_user',
                content: 'I am replying to the deleted question.',
                score: 12,
                replies: [],
              },
            ],
          },
        ],
      };

      const result = pipeline.filter(doc);

      expect(result.comments).toHaveLength(1);
      const parent = result.comments[0];
      expect(parent.id).toBe('c_deleted_parent');
      expect(parent.author).toBe('[deleted]');
      expect(parent.content).toBe('[deleted]');
      expect(parent.isDeleted).toBe(true);
      expect(parent.replies).toHaveLength(1);
      expect(parent.replies[0].id).toBe('c_child_reply');
      expect(parent.replies[0].author).toBe('responding_user');
    });

    it('cascades pruning when all replies under a deleted parent are pruned', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'c_deleted_grandparent',
            author: '[deleted]',
            content: '[deleted]',
            score: 0,
            isDeleted: true,
            replies: [
              {
                id: 'c_deleted_parent',
                author: '[deleted]',
                content: '[deleted]',
                score: 0,
                isDeleted: true,
                replies: [
                  {
                    id: 'c_bot_child',
                    author: 'AutoModerator',
                    content: 'Rule reminder',
                    score: 1,
                    replies: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = pipeline.filter(doc);
      expect(result.comments).toHaveLength(0);
    });
  });

  describe('Depth Retention and Capping', () => {
    it('defaults to retaining unlimited comment hierarchy depth when no custom maxDepth is provided', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'tier_1',
            author: 'user1',
            content: 'Tier 1 root comment (depth 0)',
            score: 10,
            replies: [
              {
                id: 'tier_2',
                author: 'user2',
                content: 'Tier 2 reply (depth 1)',
                score: 5,
                replies: [
                  {
                    id: 'tier_3',
                    author: 'user3',
                    content: 'Tier 3 reply (depth 2)',
                    score: 2,
                    replies: [
                      {
                        id: 'tier_4',
                        author: 'user4',
                        content: 'Tier 4 reply (depth 3)',
                        score: 1,
                        replies: [
                          {
                            id: 'tier_5',
                            author: 'user5',
                            content: 'Tier 5 deep reply (depth 4)',
                            score: 1,
                            replies: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = pipeline.filter(doc);

      expect(result.comments).toHaveLength(1);
      const tier1 = result.comments[0];
      expect(tier1.id).toBe('tier_1');
      expect(tier1.replies).toHaveLength(1);

      const tier2 = tier1.replies[0];
      expect(tier2.id).toBe('tier_2');
      expect(tier2.replies).toHaveLength(1);

      const tier3 = tier2.replies[0];
      expect(tier3.id).toBe('tier_3');
      expect(tier3.replies).toHaveLength(1);

      const tier4 = tier3.replies[0];
      expect(tier4.id).toBe('tier_4');
      expect(tier4.replies).toHaveLength(1);

      const tier5 = tier4.replies[0];
      expect(tier5.id).toBe('tier_5');
      expect(tier5.content).toBe('Tier 5 deep reply (depth 4)');

      // Verify explicit undefined or Infinity options also preserve full depth
      const pipelineUndefined = new FilterPipeline({ maxDepth: undefined });
      const resultUndefined = pipelineUndefined.filter(doc);
      expect(findCommentById(resultUndefined.comments, 'tier_5')?.id).toBe('tier_5');

      const pipelineInfinity = new FilterPipeline({ maxDepth: Infinity });
      const resultInfinity = pipelineInfinity.filter(doc);
      expect(findCommentById(resultInfinity.comments, 'tier_5')?.id).toBe('tier_5');
    });

    it('preserves author replies by OP and (OP) attribution at deep nesting tiers (depth 3 and 4)', () => {
      const pipeline = new FilterPipeline();
      const serializer = new MarkdownSerializer();
      const doc: ThreadDocument = {
        ...baseDoc,
        originalPost: {
          id: 'p1',
          title: 'Deep Discussion',
          author: 'op_user',
          content: 'Discussing deep architectures',
        },
        comments: [
          {
            id: 'c_root',
            author: 'commenter1',
            score: 10,
            content: 'Root level thought',
            replies: [
              {
                id: 'c_reply_1',
                author: 'commenter2',
                score: 5,
                content: 'First nested response',
                replies: [
                  {
                    id: 'c_reply_2',
                    author: 'commenter3',
                    score: 3,
                    content: 'Second nested question',
                    replies: [
                      {
                        id: 'c_op_deep_3',
                        author: 'op_user',
                        isOp: true,
                        score: 7,
                        content: 'OP reply at depth 3',
                        replies: [
                          {
                            id: 'c_op_deep_4',
                            author: 'op_user',
                            isOp: true,
                            score: 4,
                            content: 'OP follow-up snippet at depth 4',
                            replies: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const filtered = pipeline.filter(doc);

      // Verify IR node properties
      const tier4 = findCommentById(filtered.comments, 'c_op_deep_3');
      expect(tier4?.id).toBe('c_op_deep_3');
      expect(tier4?.isOp).toBe(true);

      const tier5 = findCommentById(filtered.comments, 'c_op_deep_4');
      expect(tier5?.id).toBe('c_op_deep_4');
      expect(tier5?.isOp).toBe(true);

      // Verify Markdown serialization maintains indentation and (OP) badges
      const markdown = serializer.serialize(filtered);
      expect(markdown).toContain('      - **[+7] op_user (OP)**: OP reply at depth 3');
      expect(markdown).toContain('        - **[+4] op_user (OP)**: OP follow-up snippet at depth 4');
    });

    it('respects custom maxDepth when explicitly passed in options as an upper bound', () => {
      const pipeline = new FilterPipeline({ maxDepth: 3 });
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'tier_1',
            author: 'user1',
            content: 'Tier 1 root comment (depth 0)',
            score: 10,
            replies: [
              {
                id: 'tier_2',
                author: 'user2',
                content: 'Tier 2 reply (depth 1)',
                score: 5,
                replies: [
                  {
                    id: 'tier_3',
                    author: 'user3',
                    content: 'Tier 3 reply (depth 2)',
                    score: 2,
                    replies: [
                      {
                        id: 'tier_4',
                        author: 'user4',
                        content: 'Tier 4 reply beyond depth bound (depth 3)',
                        score: 1,
                        replies: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = pipeline.filter(doc);

      expect(result.comments).toHaveLength(1);
      const tier1 = result.comments[0];
      const tier2 = tier1.replies[0];
      const tier3 = tier2.replies[0];
      expect(tier3.id).toBe('tier_3');
      // Depth 3 (hierarchical tier 4) must be pruned when maxDepth: 3 is explicitly provided
      expect(tier3.replies).toHaveLength(0);
    });

    it('supports custom depth tier limit via options', () => {
      const shallowPipeline = new FilterPipeline({ maxDepth: 2 });
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'tier_1',
            author: 'user1',
            content: 'Tier 1 root comment',
            score: 10,
            replies: [
              {
                id: 'tier_2',
                author: 'user2',
                content: 'Tier 2 reply',
                score: 5,
                replies: [
                  {
                    id: 'tier_3',
                    author: 'user3',
                    content: 'Tier 3 reply',
                    score: 2,
                    replies: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = shallowPipeline.filter(doc);

      const tier1 = result.comments[0];
      expect(tier1.replies).toHaveLength(1);
      const tier2 = tier1.replies[0];
      expect(tier2.id).toBe('tier_2');
      expect(tier2.replies).toHaveLength(0);
    });

    it('prunes deleted comment at max depth if its only children were beyond the depth limit', () => {
      const pipeline = new FilterPipeline({ maxDepth: 2 });
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [
          {
            id: 'tier_1',
            author: 'user1',
            content: 'Tier 1 root comment',
            score: 10,
            replies: [
              {
                id: 'tier_2_deleted',
                author: '[deleted]',
                content: '[deleted]',
                score: 0,
                isDeleted: true,
                replies: [
                  {
                    id: 'tier_3_child',
                    author: 'user3',
                    content: 'Tier 3 reply',
                    score: 2,
                    replies: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = pipeline.filter(doc);

      // tier_3_child is beyond maxDepth 2, so tier_2_deleted has 0 replies, thus gets pruned as a deleted leaf
      expect(result.comments[0].replies).toHaveLength(0);
    });
  });

  describe('Metadata and Immutability', () => {
    it('preserves metadata without mutating input document', () => {
      const pipeline = new FilterPipeline();
      const originalComments = [
        {
          id: 'c1',
          author: 'user1',
          content: 'Comment 1',
          score: 5,
          replies: [
            {
              id: 'c_bot',
              author: 'AutoModerator',
              content: 'Bot reply',
              score: 1,
              replies: [],
            },
            {
              id: 'c2',
              author: 'user2',
              content: 'Comment 2',
              score: 3,
              replies: [],
            },
          ],
        },
        {
          id: 'c_del',
          author: '[deleted]',
          content: '[deleted]',
          score: 0,
          isDeleted: true,
          replies: [],
        },
      ];

      const doc: ThreadDocument = {
        metadata: {
          source: 'reddit',
          title: 'Immutable Thread',
          url: 'https://reddit.com/r/test/comments/123',
          author: 'op_user',
          extractedCount: 4,
          isPartiallyLoaded: false,
        },
        originalPost: {
          id: 'p1',
          title: 'Immutable Thread',
          author: 'op_user',
          content: 'Post body',
        },
        comments: originalComments,
      };

      const result = pipeline.filter(doc);

      // DOM extraction total is preserved
      expect(result.metadata.extractedCount).toBe(4);
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].replies).toHaveLength(1);

      // Input doc must remain completely unmutated
      expect(doc.metadata.extractedCount).toBe(4);
      expect(doc.comments).toHaveLength(2);
      expect(doc.comments[0].replies).toHaveLength(2);
      expect(doc.comments[0].replies[0].id).toBe('c_bot');
    });

    it('handles empty comments gracefully', () => {
      const pipeline = new FilterPipeline();
      const doc: ThreadDocument = {
        ...baseDoc,
        comments: [],
      };

      const result = pipeline.filter(doc);
      expect(result.comments).toEqual([]);
      expect(result.metadata.extractedCount).toBe(2);
    });
  });
});
