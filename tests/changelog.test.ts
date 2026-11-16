import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseConventionalCommit,
  groupCommits,
  formatChangelogSection,
  updateChangelog,
  type ParsedCommit,
} from '../scripts/generate-changelog.mjs';

describe('Automated Changelog System', () => {
  const rootDir = path.resolve(__dirname, '..');
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');

  describe('Conventional Commit Parser', () => {
    it('parses standard conventional commit lines with scope and issue ref', () => {
      const parsed = parseConventionalCommit('a1b2c3d feat(ui): add native action button (#9)');
      expect(parsed).toEqual({
        hash: 'a1b2c3d',
        raw: 'feat(ui): add native action button (#9)',
        type: 'feat',
        scope: 'ui',
        description: 'add native action button (#9)',
        issueRef: '#9',
      });
    });

    it('parses conventional commits without scope', () => {
      const parsed = parseConventionalCommit('d4e5f6g fix: resolve race condition in SPA router');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('fix');
      expect(parsed?.scope).toBeNull();
      expect(parsed?.description).toBe('resolve race condition in SPA router');
    });

    it('falls back gracefully on non-conventional commit lines', () => {
      const parsed = parseConventionalCommit('7h8i9j0 initial commit without prefix');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('other');
      expect(parsed?.description).toBe('initial commit without prefix');
    });

    it('returns null on invalid input', () => {
      expect(parseConventionalCommit('')).toBeNull();
    });
  });

  describe('Commit Grouping & Section Formatting', () => {
    it('groups commits into Keep a Changelog categories', () => {
      const sampleCommits: ParsedCommit[] = [
        { hash: '111', raw: 'feat(core): new parser', type: 'feat', scope: 'core', description: 'new parser', issueRef: null },
        { hash: '222', raw: 'fix(ui): button layout', type: 'fix', scope: 'ui', description: 'button layout', issueRef: null },
        { hash: '333', raw: 'docs: update guide', type: 'docs', scope: null, description: 'update guide', issueRef: null },
        { hash: '444', raw: 'refactor: decouple seams', type: 'refactor', scope: null, description: 'decouple seams', issueRef: null },
        { hash: '555', raw: 'chore: bump deps', type: 'chore', scope: null, description: 'bump deps', issueRef: null },
      ];

      const groups = groupCommits(sampleCommits);
      expect(groups['Added'].length).toBe(1);
      expect(groups['Fixed'].length).toBe(1);
      expect(groups['Documentation'].length).toBe(1);
      expect(groups['Changed'].length).toBe(1);
      expect(groups['Maintenance'].length).toBe(1);

      const section = formatChangelogSection({
        version: '0.2.0',
        date: '2026-12-01',
        commits: sampleCommits,
      });

      expect(section).toContain('## [0.2.0] - 2026-12-01');
      expect(section).toContain('### Added');
      expect(section).toContain('- **core**: new parser (`111`)');
      expect(section).toContain('### Fixed');
      expect(section).toContain('- **ui**: button layout (`222`)');
    });
  });

  describe('CHANGELOG.md File Integrity', () => {
    it('CHANGELOG.md exists at repository root', () => {
      expect(fs.existsSync(changelogPath)).toBe(true);
    });

    it('contains Keep a Changelog header and Semantic Versioning reference', () => {
      const content = fs.readFileSync(changelogPath, 'utf8');
      expect(content).toContain('# Changelog');
      expect(content).toContain('Keep a Changelog');
      expect(content).toContain('Semantic Versioning');
      expect(content).toContain('## [Unreleased]');
    });

    it('documents current version [0.1.0] with categorized sections', () => {
      const content = fs.readFileSync(changelogPath, 'utf8');
      expect(content).toContain('## [0.1.0]');
      expect(content).toContain('### Added');
      expect(content).toContain('### Fixed');
    });

    it('updates changelog idempotently without creating duplicate sections', () => {
      const sampleCommits: ParsedCommit[] = [
        { hash: 'aaa', raw: 'feat(test): idempotency check', type: 'feat', scope: 'test', description: 'idempotency check', issueRef: null },
      ];

      const tempChangelog = path.join(rootDir, '.scratch', 'test-changelog.md');
      try {
        fs.writeFileSync(tempChangelog, '# Changelog\n\n## [Unreleased]\n', 'utf8');
        updateChangelog({ changelogPath: tempChangelog, version: '0.1.0', date: '2026-11-16', commits: sampleCommits });
        updateChangelog({ changelogPath: tempChangelog, version: '0.1.0', date: '2026-11-16', commits: sampleCommits });

        const content = fs.readFileSync(tempChangelog, 'utf8');
        const matches = content.match(/## \[0\.1\.0\]/g);
        expect(matches?.length).toBe(1);
      } finally {
        if (fs.existsSync(tempChangelog)) {
          fs.unlinkSync(tempChangelog);
        }
      }
    });
  });
});
