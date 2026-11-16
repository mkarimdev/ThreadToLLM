import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getCurrentVersion,
  computeNextVersion,
  parseCliArgs,
  generateChangelogSection,
  validateDeclaredIcons,
  buildAndPackageZip,
  repoRoot,
} from '../scripts/release.mjs';

describe('Unified Release Orchestration Engine', () => {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const manifestPath = path.join(repoRoot, 'manifest.json');
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');

  describe('Manifest & Version Synchronization', () => {
    it('manifests reflect identical SemVer versions', () => {
      const version = getCurrentVersion();
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(version).toBe(pkg.version);
      expect(version).toBe(manifest.version);
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('computeNextVersion calculates patch, minor, and major correctly', () => {
      expect(computeNextVersion('0.1.0', 'patch')).toBe('0.1.1');
      expect(computeNextVersion('0.1.0', 'minor')).toBe('0.2.0');
      expect(computeNextVersion('0.1.0', 'major')).toBe('1.0.0');

      expect(computeNextVersion('1.2.3', 'patch')).toBe('1.2.4');
      expect(computeNextVersion('1.2.3', 'minor')).toBe('1.3.0');
      expect(computeNextVersion('1.2.3', 'major')).toBe('2.0.0');
    });

    it('computeNextVersion rejects invalid versions and types', () => {
      expect(() => computeNextVersion('invalid', 'patch')).toThrow();
      expect(() => computeNextVersion('0.1.0', 'invalid')).toThrow();
    });
  });

  describe('CLI Argument Parser', () => {
    it('parses release type, dry-run, and publish flags', () => {
      expect(parseCliArgs(['patch'])).toEqual({
        releaseType: 'patch',
        isDryRun: false,
        isPublish: false,
        isPackageOnly: false,
      });

      expect(parseCliArgs(['minor', '--dry-run'])).toEqual({
        releaseType: 'minor',
        isDryRun: true,
        isPublish: false,
        isPackageOnly: false,
      });

      expect(parseCliArgs(['major', '--publish'])).toEqual({
        releaseType: 'major',
        isDryRun: false,
        isPublish: true,
        isPackageOnly: false,
      });

      expect(parseCliArgs(['--package-only'])).toEqual({
        releaseType: null,
        isDryRun: false,
        isPublish: false,
        isPackageOnly: true,
      });
    });
  });

  describe('Changelog Generation & Formatting', () => {
    it('groups conventional commits into Keep a Changelog categories', () => {
      const sampleCommits = [
        'feat(ui): add native action bar button (#9) (abc1234)',
        'fix(adapter): prevent false-positive partial flags (#8) (def5678)',
        'refactor: decouple platform seams (ghi9012)',
        'docs(readme): add installation guide (jkl3456)',
        'chore: bump toolchain dependencies (mno7890)',
      ];

      const section = generateChangelogSection('0.2.0', sampleCommits);

      expect(section).toContain('## [0.2.0]');
      expect(section).toContain('### Added');
      expect(section).toContain('**ui**: add native action bar button (#9) (abc1234)');
      expect(section).toContain('### Fixed');
      expect(section).toContain('**adapter**: prevent false-positive partial flags (#8) (def5678)');
      expect(section).toContain('### Changed');
      expect(section).toContain('decouple platform seams (ghi9012)');
      expect(section).toContain('### Documentation');
      expect(section).toContain('### Maintenance');
    });

    it('CHANGELOG.md exists at root with current version documented', () => {
      expect(fs.existsSync(changelogPath)).toBe(true);
      const content = fs.readFileSync(changelogPath, 'utf8');
      expect(content).toContain('# Changelog');
      expect(content).toContain('Keep a Changelog');
      expect(content).toContain('## [Unreleased]');
      expect(content).toContain('## [0.1.0]');
    });
  });

  describe('Packaging & Icon Validation', () => {
    let rootZipToCleanup: string | null = null;

    afterAll(() => {
      if (rootZipToCleanup && fs.existsSync(rootZipToCleanup)) {
        try {
          fs.unlinkSync(rootZipToCleanup);
        } catch {
          // ignore
        }
      }
    });

    it('validates declared icons exist and match PNG headers', () => {
      const icons = validateDeclaredIcons(manifestPath, path.join(repoRoot, 'public'));
      expect(icons.length).toBeGreaterThanOrEqual(3);
      for (const icon of icons) {
        expect(fs.existsSync(icon.fullPath)).toBe(true);
      }
    });

    it('packages the production build into a valid distribution ZIP archive', () => {
      const version = getCurrentVersion();
      const distDir = path.join(repoRoot, 'dist');
      const skipBuild = fs.existsSync(distDir);
      const result = buildAndPackageZip(version, { silent: true, skipBuild });
      rootZipToCleanup = result.rootZipPath;

      expect(result.version).toBe(version);
      expect(fs.existsSync(result.zipPath)).toBe(true);
      expect(result.fileCount).toBeGreaterThan(0);
      expect(result.zipSize).toBeGreaterThan(0);
    }, 60000);
  });
});
