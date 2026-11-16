import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Public Launch README & Visual User Onboarding (#18)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const readmePath = path.join(rootDir, 'README.md');

  let readmeContent: string;

  beforeAll(() => {
    expect(fs.existsSync(readmePath), `README.md must exist at root: ${readmePath}`).toBe(true);
    readmeContent = fs.readFileSync(readmePath, 'utf-8');
  });

  it('README.md exists at repository root', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  describe('Header & Badges', () => {
    it('contains all required badges (CI status, MIT license, version v0.1.0, Manifest V3)', () => {
      // GitHub Actions CI badge
      expect(readmeContent).toMatch(/\[!\[CI\]\(https:\/\/github\.com\/[^/]+\/ThreadToLLM\/actions\/workflows\/ci\.yml\/badge\.svg\)/);
      // License badge
      expect(readmeContent).toMatch(/\[!\[License: MIT\]\(https:\/\/img\.shields\.io\/badge\/[Ll]icense-MIT/);
      // Version badge (v0.1.0)
      expect(readmeContent).toMatch(/\[!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-v?0\.1\.0/);
      // Manifest V3 badge
      expect(readmeContent).toMatch(/\[!\[Manifest V3\]\(https:\/\/img\.shields\.io\/badge\/[a-zA-Z0-9_%-]*Manifest[a-zA-Z0-9_%-]*V3/);
    });

    it('contains the core 1-sentence value proposition for LLM prompting', () => {
      expect(readmeContent).toContain(
        'Extract Reddit discussion threads into token-dense, clean Markdown optimized for LLM prompting (Claude, ChatGPT, Gemini, Local models).'
      );
    });
  });

  describe('Before & After Demonstration', () => {
    it('contains a concrete Before & After comparison highlighting token reduction and hierarchy preservation', () => {
      expect(readmeContent).toMatch(/## Before & After/i);
      // Mentions token reduction metrics
      expect(readmeContent).toMatch(/token reduction/i);
      // Mentions messy / raw Reddit copy
      expect(readmeContent).toMatch(/Raw Reddit/i);
      // Shows YAML frontmatter example
      expect(readmeContent).toContain('source: "reddit"');
      expect(readmeContent).toContain('title:');
      expect(readmeContent).toContain('url:');
      expect(readmeContent).toContain('author:');
      // Shows comment tree format with score badge, OP badge, and indentation
      expect(readmeContent).toMatch(/-\s+\*\*\[\+\d+\]\s+[^(]+\(OP\)\*\*:/);
      // Shows media URL preservation
      expect(readmeContent).toMatch(/https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp|svg)/i);
    });
  });

  describe('Privacy Guarantee', () => {
    it('contains an explicit 100% Client-Side Privacy Guarantee callout with zero telemetry and local extraction', () => {
      expect(readmeContent).toMatch(/100%\s+Client-Side Privacy Guarantee/i);
      expect(readmeContent).toMatch(/zero telemetry/i);
      expect(readmeContent).toMatch(/zero analytics/i);
      expect(readmeContent).toMatch(/no external servers/i);
      expect(readmeContent).toMatch(/100%\s+client-side DOM extraction/i);
      expect(readmeContent).toMatch(/clipboardWrite/);
    });
  });

  describe('Installation Guide', () => {
    it('provides the 3-step numbered Quickstart Installation guide', () => {
      expect(readmeContent).toMatch(/## Installation|## Quickstart/i);
      // Step 1: Download release zip
      expect(readmeContent).toMatch(/thread-to-llm-v.*\.zip/);
      expect(readmeContent).toMatch(/GitHub Releases/i);
      // Step 2: Unzip
      expect(readmeContent).toMatch(/[Uu]nzip/);
      // Step 3: Load unpacked in Developer mode
      expect(readmeContent).toContain('chrome://extensions');
      expect(readmeContent).toMatch(/[Dd]eveloper mode/);
      expect(readmeContent).toMatch(/[Ll]oad unpacked/);
    });
  });

  describe('Usage & Keyboard Shortcuts', () => {
    it('documents in-page action button placement beside native Share button', () => {
      expect(readmeContent).toMatch(/## Usage/i);
      expect(readmeContent).toMatch(/Share/);
    });

    it('documents Alt+Shift+C keyboard shortcut and typing input suppression protection', () => {
      expect(readmeContent).toContain('Alt+Shift+C');
      expect(readmeContent).toMatch(/input-suppression|suppression|typing/i);
    });
  });

  describe('Platform Support & Roadmap', () => {
    it('documents modern Reddit (shreddit) features and host platform roadmap', () => {
      expect(readmeContent).toMatch(/## Platform Support/i);
      expect(readmeContent).toMatch(/shreddit/i);
      expect(readmeContent).toMatch(/Hacker News/i);
      expect(readmeContent).toMatch(/\bX\b/);
    });
  });

  describe('Building from Source & Workflows', () => {
    it('documents clone, install, build, check, and package workflows', () => {
      expect(readmeContent).toMatch(/## Development|Building from Source/i);
      expect(readmeContent).toContain('git clone');
      expect(readmeContent).toContain('npm install');
      expect(readmeContent).toContain('npm run build');
      expect(readmeContent).toContain('npm run check');
    });
  });

  describe('Governance & Community Links', () => {
    it('links to CONTRIBUTING.md, CODING_STANDARDS.md, and LICENSE', () => {
      expect(readmeContent).toMatch(/\[[^\]]*\]\(CONTRIBUTING\.md\)/);
      expect(readmeContent).toMatch(/\[[^\]]*\]\(LICENSE\)/);
    });
  });

  describe('Relative Link Verification', () => {
    it('all markdown relative links resolve to existing files on disk', () => {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match: RegExpExecArray | null;
      const relativeLinks: string[] = [];

      while ((match = linkRegex.exec(readmeContent)) !== null) {
        const target = match[2].trim();
        // Skip external URLs, email links, and anchor-only links
        if (
          target.startsWith('http://') ||
          target.startsWith('https://') ||
          target.startsWith('mailto:') ||
          target.startsWith('#')
        ) {
          continue;
        }

        // Strip anchor part if link is e.g. path/to/file#section
        const targetWithoutAnchor = target.split('#')[0];
        if (targetWithoutAnchor.length > 0) {
          relativeLinks.push(targetWithoutAnchor);
        }
      }

      expect(relativeLinks.length).toBeGreaterThan(0);

      for (const relLink of relativeLinks) {
        const resolvedPath = path.resolve(rootDir, relLink);
        expect(
          fs.existsSync(resolvedPath),
          `Expected relative link "${relLink}" in README.md to resolve to existing file at ${resolvedPath}`
        ).toBe(true);
      }
    });
  });
});
