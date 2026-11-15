import { ThreadDocument } from '../../src/core';

export const sampleThreadFixture: ThreadDocument = {
  metadata: {
    source: 'reddit',
    title: 'Ask Reddit: What is your favorite TypeScript pattern?',
    url: 'https://reddit.com/r/typescript/comments/xyz123/favorite_pattern',
    author: 'ts_guru',
    extractedCount: 5,
    isPartiallyLoaded: false,
  },
  originalPost: {
    id: 't3_xyz123',
    title: 'Ask Reddit: What is your favorite TypeScript pattern?',
    author: 'ts_guru',
    content: 'Curious what architectural patterns have saved you the most debugging time in large codebases.\n\nPersonally, I love discriminated unions for domain state modeling.',
  },
  comments: [
    {
      id: 'c1',
      author: 'dev_alex',
      content: 'Branded types for domain IDs! Prevents passing a UserId where an OrderId is expected.',
      score: 84,
      replies: [
        {
          id: 'c1_1',
          author: 'ts_guru',
          content: 'Completely agree. Zero runtime cost with total compile-time safety.',
          score: 32,
          isOp: true,
          replies: [
            {
              id: 'c1_1_1',
              author: 'curious_junior',
              content: 'Does this work well with JSON serialization though?',
              score: 5,
              replies: [],
            },
          ],
        },
      ],
    },
    {
      id: 'c2',
      author: '[deleted]',
      content: '[deleted]',
      score: 0,
      isDeleted: true,
      replies: [
        {
          id: 'c2_1',
          author: 'helpful_dev',
          content: 'To answer the deleted question: yes, satisfies operator solves this in TS 4.9+.',
          score: 19,
          replies: [],
        },
      ],
    },
    {
      id: 'c3',
      author: 'cynic',
      content: 'Any pattern that adds more than 2 lines of types is overengineering.\n\nKeep it simple.',
      score: -8,
      replies: [],
    },
  ],
};

export const expectedSampleThreadMarkdown = `---
source: reddit
title: "Ask Reddit: What is your favorite TypeScript pattern?"
url: "https://reddit.com/r/typescript/comments/xyz123/favorite_pattern"
author: ts_guru
extracted_count: 5
partial_load: false
---

# Ask Reddit: What is your favorite TypeScript pattern?

Curious what architectural patterns have saved you the most debugging time in large codebases.

Personally, I love discriminated unions for domain state modeling.

- **[+84] dev_alex**: Branded types for domain IDs! Prevents passing a UserId where an OrderId is expected.
  - **[+32] ts_guru (OP)**: Completely agree. Zero runtime cost with total compile-time safety.
    - **[+5] curious_junior**: Does this work well with JSON serialization though?
- **[0] [deleted]**: [deleted]
  - **[+19] helpful_dev**: To answer the deleted question: yes, satisfies operator solves this in TS 4.9+.
- **[-8] cynic**: Any pattern that adds more than 2 lines of types is overengineering.

  Keep it simple.`;
