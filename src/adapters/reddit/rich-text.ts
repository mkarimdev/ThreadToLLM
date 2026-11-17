/**
 * ThreadToLLM - Rich Text to Markdown Converter
 * Renders a host-platform DOM subtree into token-dense Markdown, preserving
 * lists, code, quotes, and links inside post bodies and comments (ADR-0004, ADR-0005).
 */

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

interface ContentNodeVisitors {
  text: (value: string) => void;
  element: (element: Element) => void;
}

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/**
 * Walks the content nodes of a DOM subtree, applying the same text and element
 * handling everywhere so comment scoping and whitespace rules stay consistent.
 */
function visitContentNodes(
  node: Node,
  skipNestedComments: boolean,
  visitors: ContentNodeVisitors
): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === TEXT_NODE) {
      visitors.text(normalizeInlineWhitespace(child.textContent ?? ''));
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) {
      continue;
    }
    const element = child as Element;
    if (skipNestedComments && element.tagName.toUpperCase() === 'SHREDDIT-COMMENT') {
      continue;
    }
    visitors.element(element);
  }
}

function isList(element: Element): boolean {
  const tag = element.tagName.toUpperCase();
  return tag === 'UL' || tag === 'OL';
}

function isBlockElement(element: Element): boolean {
  const tag = element.tagName.toUpperCase();
  return tag === 'P' || tag === 'DIV' || tag === 'PRE' || tag === 'BLOCKQUOTE' || isList(element);
}

function renderListItemContent(
  item: Element,
  skipNestedComments: boolean
): { text: string; nestedLists: Element[] } {
  let inline = '';
  const nestedLists: Element[] = [];

  visitContentNodes(item, skipNestedComments, {
    text: (value) => {
      inline += value;
    },
    element: (element) => {
      if (isList(element)) {
        nestedLists.push(element);
      } else if (isBlockElement(element)) {
        inline += ` ${renderBlock(element, skipNestedComments)} `;
      } else {
        inline += renderInline(element, skipNestedComments);
      }
    },
  });

  return { text: inline.trim(), nestedLists };
}

function renderList(
  list: Element,
  skipNestedComments: boolean,
  indent = ''
): string {
  const ordered = list.tagName.toUpperCase() === 'OL';
  const lines: string[] = [];
  let index = 0;

  for (const child of Array.from(list.children)) {
    if (child.tagName.toUpperCase() !== 'LI') {
      continue;
    }
    const marker = ordered ? `${index + 1}. ` : '- ';
    index++;
    const { text, nestedLists } = renderListItemContent(child, skipNestedComments);
    lines.push(`${indent}${marker}${text}`);
    for (const nested of nestedLists) {
      lines.push(renderList(nested, skipNestedComments, `${indent}  `));
    }
  }

  return lines.join('\n');
}

function renderCodeBlock(element: Element): string {
  const code = element.querySelector('code')?.textContent ?? element.textContent ?? '';
  const trimmed = code.replace(/^\n/, '').replace(/\n$/, '');
  return `\`\`\`\n${trimmed}\n\`\`\``;
}

function renderBlockquote(element: Element, skipNestedComments: boolean): string {
  return domToMarkdown(element, skipNestedComments)
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

function renderBlock(element: Element, skipNestedComments: boolean): string {
  const tag = element.tagName.toUpperCase();
  if (isList(element)) {
    return renderList(element, skipNestedComments);
  }
  if (tag === 'PRE') {
    return renderCodeBlock(element);
  }
  if (tag === 'BLOCKQUOTE') {
    return renderBlockquote(element, skipNestedComments);
  }
  return renderChildren(element, skipNestedComments).join('\n');
}

function renderChildren(node: Node, skipNestedComments: boolean): string[] {
  const blocks: string[] = [];
  let inline = '';

  const flush = () => {
    const value = inline.trim();
    if (value) {
      blocks.push(value);
    }
    inline = '';
  };

  visitContentNodes(node, skipNestedComments, {
    text: (value) => {
      inline += value;
    },
    element: (element) => {
      if (isBlockElement(element)) {
        flush();
        const rendered = renderBlock(element, skipNestedComments);
        if (rendered) {
          blocks.push(rendered);
        }
      } else {
        inline += renderInline(element, skipNestedComments);
      }
    },
  });

  flush();
  return blocks;
}

function renderInline(element: Element, skipNestedComments: boolean): string {
  const tag = element.tagName.toUpperCase();
  if (tag === 'BR') {
    return '\n';
  }
  if (tag === 'CODE') {
    const code = element.textContent ?? '';
    if (code.includes('`')) {
      return `\`\` ${code} \`\``;
    }
    return `\`${code}\``;
  }
  if (tag === 'A') {
    const text = renderInlineChildren(element, skipNestedComments);
    const href = element.getAttribute('href')?.trim();
    return href ? `[${text}](${href})` : text;
  }
  return renderInlineChildren(element, skipNestedComments);
}

function renderInlineChildren(node: Node, skipNestedComments: boolean): string {
  let out = '';
  visitContentNodes(node, skipNestedComments, {
    text: (value) => {
      out += value;
    },
    element: (element) => {
      out += renderInline(element, skipNestedComments);
    },
  });
  return out;
}

/**
 * Renders a DOM subtree as Markdown blocks separated by blank lines.
 */
export function domToMarkdown(node: Node, skipNestedComments = false): string {
  return renderChildren(node, skipNestedComments).join('\n\n');
}
