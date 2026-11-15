import { describe, it, expect } from 'vitest';
import { MarkdownSerializer, ThreadDocument } from '../src/core';
import {
  sampleThreadFixture,
  expectedSampleThreadMarkdown,
} from './fixtures/sample-thread.fixture';

describe('MarkdownSerializer', () => {
  const serializer = new MarkdownSerializer();

  describe('YAML Frontmatter', () => {
    const minimalDoc: ThreadDocument = {
      metadata: {
        source: 'reddit',
        title: 'How to build high-signal AI prompts',
        url: 'https://reddit.com/r/programming/comments/12345/high_signal_ai_prompts',
        author: 'prompt_engineer',
        extractedCount: 0,
        isPartiallyLoaded: false,
      },
      originalPost: {
        id: 'post_1',
        title: 'How to build high-signal AI prompts',
        author: 'prompt_engineer',
        content: 'This is the main post content discussing prompt techniques.',
      },
      comments: [],
    };

    it('emits structured YAML frontmatter containing core thread metadata fields', () => {
      const output = serializer.serialize(minimalDoc);

      expect(output).toContain('---');
      expect(output).toContain('source: reddit');
      expect(output).toContain('title: "How to build high-signal AI prompts"');
      expect(output).toContain('url: "https://reddit.com/r/programming/comments/12345/high_signal_ai_prompts"');
      expect(output).toContain('author: prompt_engineer');
      expect(output).not.toContain('isPartiallyLoaded');
    });

    it('correctly appends isPartiallyLoaded: true when thread is partially loaded', () => {
      const partialDoc: ThreadDocument = {
        ...minimalDoc,
        metadata: {
          ...minimalDoc.metadata,
          extractedCount: 15,
          isPartiallyLoaded: true,
        },
      };

      const output = serializer.serialize(partialDoc);
      expect(output).toContain('isPartiallyLoaded: true');
    });

    it('quotes strings that could be coerced into YAML numbers or booleans', () => {
      const ambiguousDoc: ThreadDocument = {
        ...minimalDoc,
        metadata: {
          ...minimalDoc.metadata,
          author: '12345',
          title: 'true',
        },
      };

      const output = serializer.serialize(ambiguousDoc);
      expect(output).toContain('author: "12345"');
      expect(output).toContain('title: "true"');
    });

    it('frontmatter schema contract: only emits permitted canonical keys and suppresses non-true flags and counters', () => {
      const output = serializer.serialize(minimalDoc);
      const frontmatterBlock = output.split('---')[1];
      const frontmatterKeys = frontmatterBlock
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.includes(':'))
        .map((line) => line.split(':')[0].trim());

      // Only canonical spec keys allowed
      expect(frontmatterKeys).toEqual(['source', 'title', 'url', 'author']);
      expect(frontmatterKeys).not.toContain('extracted_count');
      expect(frontmatterKeys).not.toContain('extractedCount');
      expect(frontmatterKeys).not.toContain('partial_load');
      expect(frontmatterKeys).not.toContain('isPartiallyLoaded');

      // Now verify partial doc only adds isPartiallyLoaded
      const partialDoc: ThreadDocument = {
        ...minimalDoc,
        metadata: {
          ...minimalDoc.metadata,
          isPartiallyLoaded: true,
        },
      };
      const partialOutput = serializer.serialize(partialDoc);
      const partialFrontmatterBlock = partialOutput.split('---')[1];
      const partialKeys = partialFrontmatterBlock
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.includes(':'))
        .map((line) => line.split(':')[0].trim());

      expect(partialKeys).toEqual(['source', 'title', 'url', 'author', 'isPartiallyLoaded']);
    });
  });

  describe('Original Post', () => {
    it('renders post title as h1 and post content below frontmatter', () => {
      const doc: ThreadDocument = {
        metadata: {
          source: 'reddit',
          title: 'Post Title',
          url: 'https://reddit.com/r/test/comments/1',
          author: 'author1',
          extractedCount: 0,
          isPartiallyLoaded: false,
        },
        originalPost: {
          id: 'p1',
          title: 'Post Title',
          author: 'author1',
          content: 'This is the main post body text.',
        },
        comments: [],
      };

      const output = serializer.serialize(doc);
      const expectedSection = '---\n\n# Post Title\n\nThis is the main post body text.';
      expect(output).toContain(expectedSection);
    });

    it('renders post title alone when post content is empty', () => {
      const doc: ThreadDocument = {
        metadata: {
          source: 'reddit',
          title: 'Link-Only Post',
          url: 'https://reddit.com/r/test/comments/2',
          author: 'author2',
          extractedCount: 0,
          isPartiallyLoaded: false,
        },
        originalPost: {
          id: 'p2',
          title: 'Link-Only Post',
          author: 'author2',
          content: '',
        },
        comments: [],
      };

      const output = serializer.serialize(doc);
      expect(output.endsWith('---\n\n# Link-Only Post')).toBe(true);
    });
  });

  describe('Comment Tree Serialization', () => {
    const baseMetadata = {
      source: 'reddit',
      title: 'Discussion Thread',
      url: 'https://reddit.com/r/test/comments/123',
      author: 'op_user',
      extractedCount: 3,
      isPartiallyLoaded: false,
    };

    const basePost = {
      id: 'p1',
      title: 'Discussion Thread',
      author: 'op_user',
      content: 'Original post context.',
    };

    it('formats flat comments with score badges and OP indicators', () => {
      const doc: ThreadDocument = {
        metadata: baseMetadata,
        originalPost: basePost,
        comments: [
          {
            id: 'c1',
            author: 'alice',
            content: 'Great insight here.',
            score: 42,
            replies: [],
          },
          {
            id: 'c2',
            author: 'op_user',
            content: 'Thank you for reading!',
            score: 15,
            isOp: true,
            replies: [],
          },
          {
            id: 'c3',
            author: 'skeptic',
            content: 'I disagree with this approach.',
            score: -4,
            replies: [],
          },
          {
            id: 'c4',
            author: 'neutral_user',
            content: 'Neutral observation.',
            score: 0,
            replies: [],
          },
        ],
      };

      const output = serializer.serialize(doc);

      expect(output).toContain('- **[+42] alice**: Great insight here.');
      expect(output).toContain('- **[+15] op_user (OP)**: Thank you for reading!');
      expect(output).toContain('- **[-4] skeptic**: I disagree with this approach.');
      expect(output).toContain('- **[0] neutral_user**: Neutral observation.');
    });

    it('infers (OP) indicator when author matches original post author even if isOp is not explicitly set', () => {
      const doc: ThreadDocument = {
        metadata: baseMetadata,
        originalPost: basePost,
        comments: [
          {
            id: 'c1',
            author: 'op_user',
            content: 'Follow up info.',
            score: 7,
            replies: [],
          },
        ],
      };

      const output = serializer.serialize(doc);
      expect(output).toContain('- **[+7] op_user (OP)**: Follow up info.');
    });

    it('indents nested replies preserving hierarchical depth', () => {
      const doc: ThreadDocument = {
        metadata: baseMetadata,
        originalPost: basePost,
        comments: [
          {
            id: 'c1',
            author: 'alice',
            content: 'Root level discussion point.',
            score: 50,
            replies: [
              {
                id: 'c1_1',
                author: 'bob',
                content: 'First tier reply to Alice.',
                score: 20,
                replies: [
                  {
                    id: 'c1_1_1',
                    author: 'charlie',
                    content: 'Second tier nested reply.',
                    score: 5,
                    replies: [
                      {
                        id: 'c1_1_1_1',
                        author: 'op_user',
                        content: 'Third tier reply from the OP.',
                        score: 12,
                        isOp: true,
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

      const output = serializer.serialize(doc);

      const expectedCommentsTree = [
        '- **[+50] alice**: Root level discussion point.',
        '  - **[+20] bob**: First tier reply to Alice.',
        '    - **[+5] charlie**: Second tier nested reply.',
        '      - **[+12] op_user (OP)**: Third tier reply from the OP.',
      ].join('\n');

      expect(output).toContain(expectedCommentsTree);
    });

    it('formats deleted comment placeholders without OP attribution', () => {
      const doc: ThreadDocument = {
        metadata: baseMetadata,
        originalPost: basePost,
        comments: [
          {
            id: 'c_del',
            author: '[deleted]',
            content: '[deleted]',
            score: 0,
            isDeleted: true,
            isOp: true, // Should be suppressed because comment is deleted
            replies: [
              {
                id: 'c_child',
                author: 'active_user',
                content: 'Active reply underneath deleted parent.',
                score: 18,
                replies: [],
              },
            ],
          },
        ],
      };

      const output = serializer.serialize(doc);

      expect(output).toContain('- **[0] [deleted]**: [deleted]');
      expect(output).not.toContain('[deleted] (OP)');
      expect(output).toContain('  - **[+18] active_user**: Active reply underneath deleted parent.');
    });

    it('preserves content when author account is deleted ([deleted]) but comment is not deleted', () => {
      const doc: ThreadDocument = {
        metadata: baseMetadata,
        originalPost: basePost,
        comments: [
          {
            id: 'c_account_del',
            author: '[deleted]',
            content: 'High-signal technical advice from a deleted account.',
            score: 42,
            isDeleted: false,
            replies: [],
          },
        ],
      };

      const output = serializer.serialize(doc);
      expect(output).toContain('- **[+42] [deleted]**: High-signal technical advice from a deleted account.');
    });

    it('indents multiline comment paragraphs to preserve markdown list hierarchy', () => {
      const doc: ThreadDocument = {
        metadata: baseMetadata,
        originalPost: basePost,
        comments: [
          {
            id: 'c_multi',
            author: 'alice',
            content: 'Paragraph 1.\n\nParagraph 2 with more details.',
            score: 10,
            replies: [
              {
                id: 'c_nested_multi',
                author: 'bob',
                content: 'First line.\nSecond line.',
                score: 3,
                replies: [],
              },
            ],
          },
        ],
      };

      const output = serializer.serialize(doc);

      const expectedMulti = [
        '- **[+10] alice**: Paragraph 1.',
        '',
        '  Paragraph 2 with more details.',
        '  - **[+3] bob**: First line.',
        '    Second line.',
      ].join('\n');

      expect(output).toContain(expectedMulti);
    });
  });

  describe('End-to-End Fixture Verification', () => {
    it('serializes a complex thread matching the expected token-dense markdown fixture exactly', () => {
      const output = serializer.serialize(sampleThreadFixture);
      expect(output).toBe(expectedSampleThreadMarkdown);
    });
  });
});
