// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { RedditAdapter } from '../src/adapters/reddit/reddit.adapter';

describe('RedditAdapter rich text extraction', () => {
  let adapter: RedditAdapter;
  let richTextFixture: HTMLDivElement;
  let listOnlyFixture: HTMLDivElement;

  beforeAll(() => {
    adapter = new RedditAdapter();

    richTextFixture = document.createElement('div');
    richTextFixture.innerHTML = `
      <shreddit-post id="t3_rich" post-title="Rich post" author="alice" permalink="/r/test/comments/rich">
        <div slot="text-body">
          <p>Setup steps:</p>
          <ol>
            <li>Install the tool</li>
            <li>Configure it</li>
          </ol>
          <p>Docs at <a href="https://example.com/docs">the site</a>.</p>
          <pre><code>npm install tool
npm run build</code></pre>
          <blockquote><p>Useful tip.</p></blockquote>
        </div>
      </shreddit-post>
      <shreddit-comment thingid="c_rich" author="bob" score="10" depth="0">
        <div slot="comment">
          <p>Try <code>strictNullChecks</code> from the <a href="https://ts.dev/strict">docs</a>.</p>
        </div>
      </shreddit-comment>
    `;

    listOnlyFixture = document.createElement('div');
    listOnlyFixture.innerHTML = `
      <shreddit-post id="t3_list" post-title="List post" author="alice" permalink="/r/test/comments/list">
      </shreddit-post>
      <shreddit-comment thingid="c_list" author="bob" score="10" depth="0">
        <div slot="comment">
          <ul>
            <li>Alpha</li>
            <li>Beta</li>
            <li>Gamma</li>
          </ul>
          <shreddit-comment thingid="c_child" author="carol" score="3" depth="1">
            <div slot="comment"><p>Child-only text</p></div>
          </shreddit-comment>
        </div>
      </shreddit-comment>
    `;
  });

  it('preserves rich formatting from the Original Post body', () => {
    const doc = adapter.extract(richTextFixture);

    expect(doc.originalPost.content).toBe(
      'Setup steps:\n\n' +
        '1. Install the tool\n2. Configure it\n\n' +
        'Docs at [the site](https://example.com/docs).\n\n' +
        '```\nnpm install tool\nnpm run build\n```\n\n' +
        '> Useful tip.'
    );
  });

  it('preserves inline code and links inside a comment', () => {
    const doc = adapter.extract(richTextFixture);

    expect(doc.comments[0].content).toBe(
      'Try `strictNullChecks` from the [docs](https://ts.dev/strict).'
    );
  });

  it('keeps item spacing and line breaks for comments consisting only of a list', () => {
    const doc = adapter.extract(listOnlyFixture);

    expect(doc.comments[0].content).toBe('- Alpha\n- Beta\n- Gamma');
  });

  it('does not leak nested child comment text into the parent comment body', () => {
    const doc = adapter.extract(listOnlyFixture);

    expect(doc.comments[0].content).not.toContain('Child-only text');
    expect(doc.comments[0].replies[0].content).toBe('Child-only text');
  });
});
