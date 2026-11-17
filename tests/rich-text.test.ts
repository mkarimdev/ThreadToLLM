// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { domToMarkdown } from '../src/adapters/reddit/rich-text';

function parse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

// Fixtures parsed once at module scope (CODING_STANDARDS.md)
const bulletedListFixture = parse(`
  <p>Here are the options:</p>
  <ul>
    <li>First option</li>
    <li>Second option</li>
  </ul>
`);
const orderedListFixture = parse(`
  <ol>
    <li>Clone the repository</li>
    <li>Run the installer</li>
    <li>Reload the extension</li>
  </ol>
`);
const nestedListFixture = parse(`
  <ul>
    <li>Databases
      <ul>
        <li>PostgreSQL</li>
        <li>SQLite</li>
      </ul>
    </li>
    <li>Caches</li>
  </ul>
`);
const codeBlockFixture = parse(`
  <p>Use this snippet:</p>
  <pre><code>const x: number = 1;
console.log(x);</code></pre>
`);
const inlineCodeFixture = parse('<p>Install with <code>npm install</code> then run the build.</p>');
const blockquoteFixture = parse(`
  <p>Before proceeding:</p>
  <blockquote>
    <p>First quoted paragraph.</p>
    <p>Second quoted paragraph.</p>
  </blockquote>
`);
const linkFixture = parse('<p>Read the <a href="https://example.com/docs">documentation</a> first.</p>');
const hrefLessLinkFixture = parse('<p>See <a>this note</a> below.</p>');
const richListFixture = parse(`
  <ul>
    <li>Use <code>foo()</code> and see <a href="/docs">docs</a>.</li>
  </ul>
`);
const lineBreakFixture = parse('<p>First line<br />second line</p>');

describe('domToMarkdown', () => {
  it('converts a bulleted list to indented "- " markdown items', () => {
    expect(domToMarkdown(bulletedListFixture)).toBe(
      'Here are the options:\n\n- First option\n- Second option'
    );
  });

  it('converts an ordered list to "1. ", "2. " markdown items', () => {
    expect(domToMarkdown(orderedListFixture)).toBe(
      '1. Clone the repository\n2. Run the installer\n3. Reload the extension'
    );
  });

  it('indents nested list items beneath their parent item', () => {
    expect(domToMarkdown(nestedListFixture)).toBe('- Databases\n  - PostgreSQL\n  - SQLite\n- Caches');
  });

  it('converts <pre><code> blocks to fenced code blocks with line breaks preserved', () => {
    expect(domToMarkdown(codeBlockFixture)).toBe(
      'Use this snippet:\n\n```\nconst x: number = 1;\nconsole.log(x);\n```'
    );
  });

  it('wraps inline <code> in backticks', () => {
    expect(domToMarkdown(inlineCodeFixture)).toBe('Install with `npm install` then run the build.');
  });

  it('prefixes every line of a <blockquote> with "> "', () => {
    expect(domToMarkdown(blockquoteFixture)).toBe(
      'Before proceeding:\n\n> First quoted paragraph.\n>\n> Second quoted paragraph.'
    );
  });

  it('converts links with an href to markdown links', () => {
    expect(domToMarkdown(linkFixture)).toBe('Read the [documentation](https://example.com/docs) first.');
  });

  it('renders a link without an href as plain text', () => {
    expect(domToMarkdown(hrefLessLinkFixture)).toBe('See this note below.');
  });

  it('preserves inline code and links inside list items', () => {
    expect(domToMarkdown(richListFixture)).toBe('- Use `foo()` and see [docs](/docs).');
  });

  it('converts <br> to a line break', () => {
    expect(domToMarkdown(lineBreakFixture)).toBe('First line\nsecond line');
  });
});
