import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('CSS Selector Mechanical Guardrails', () => {
  const INVALID_NUMERIC_ID_PATTERN = /(?:querySelector|querySelectorAll|closest)\s*\(\s*['"`][^'"`]*#[0-9][^'"`]*['"`]\s*\)/;

  it('detects unescaped numeric ID selectors in selector patterns', () => {
    expect(INVALID_NUMERIC_ID_PATTERN.test("doc.querySelector('#2x-container')")).toBe(true);
    expect(INVALID_NUMERIC_ID_PATTERN.test('doc.querySelector("[id=\\"2x-container\\"]")')).toBe(false);
    expect(INVALID_NUMERIC_ID_PATTERN.test("doc.querySelector('#siteTable')")).toBe(false);
  });

  it('ensures no source file in src/ uses unescaped numeric ID selectors in querySelector/closest', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const sourceFiles = getAllSourceFiles(srcDir);

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, index) => {
        if (INVALID_NUMERIC_ID_PATTERN.test(lineText)) {
          violations.push({
            file: path.relative(path.resolve(__dirname, '..'), file),
            line: index + 1,
            text: lineText.trim(),
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
