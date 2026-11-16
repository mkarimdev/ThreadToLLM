import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateVersionParity,
  validateDeclaredIcons,
  packageRelease,
  parseZipEntries,
  extractZipFile,
} from '../scripts/package-release.mjs';

describe('Release Packaging & Verification Seam', () => {
  const rootDir = path.resolve(__dirname, '..');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const manifestPath = path.join(rootDir, 'manifest.json');
  const publicDir = path.join(rootDir, 'public');

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  describe('Version Parity', () => {
    it('asserts that package.json version matches manifest.json version', () => {
      expect(packageJson.version).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(packageJson.version).toBe(manifest.version);
    });

    it('validateVersionParity succeeds when versions match', () => {
      const version = validateVersionParity(packageJsonPath, manifestPath);
      expect(version).toBe(packageJson.version);
    });

    it('validateVersionParity throws a descriptive error when versions mismatch', () => {
      // Create temporary mismatched files
      const tempDir = path.join(rootDir, '.temp-version-test');
      fs.mkdirSync(tempDir, { recursive: true });
      try {
        const tempPkg = path.join(tempDir, 'package.json');
        const tempManifest = path.join(tempDir, 'manifest.json');

        fs.writeFileSync(tempPkg, JSON.stringify({ version: '1.0.0' }));
        fs.writeFileSync(tempManifest, JSON.stringify({ version: '1.0.1' }));

        expect(() => validateVersionParity(tempPkg, tempManifest)).toThrow(
          /Version mismatch: package\.json specifies "1\.0\.0" but manifest\.json specifies "1\.0\.1"/
        );
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Icon Asset Verification', () => {
    const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    it('verifies that all icons declared in manifest.json exist on disk with valid PNG signatures and exact dimensions', () => {
      const validated = validateDeclaredIcons(manifestPath, publicDir);

      expect(validated.length).toBeGreaterThanOrEqual(3);
      const sizes = validated.map(v => v.width);
      expect(sizes).toContain(16);
      expect(sizes).toContain(48);
      expect(sizes).toContain(128);

      for (const icon of validated) {
        expect(fs.existsSync(icon.fullPath)).toBe(true);
        expect(icon.bytes).toBeGreaterThan(0);
        expect(icon.width).toBe(icon.height);

        const buffer = fs.readFileSync(icon.fullPath);
        expect(buffer.subarray(0, 8)).toEqual(PNG_HEADER);
      }
    });
  });

  describe('Distribution Package Creation', () => {
    it('packages the production build into a valid distribution ZIP archive', () => {
      const result = packageRelease({
        rootDir,
        silent: true,
      });

      expect(result.version).toBe(packageJson.version);
      expect(fs.existsSync(result.zipPath)).toBe(true);
      expect(fs.existsSync(result.rootZipPath)).toBe(true);
      expect(result.fileCount).toBeGreaterThan(0);
      expect(result.zipSize).toBeGreaterThan(0);

      const zipBuffer = fs.readFileSync(result.zipPath);
      const entries = parseZipEntries(zipBuffer);
      const fileNames = entries.map(e => e.name);

      // Manifest check
      expect(fileNames).toContain('manifest.json');
      const manifestContent = JSON.parse(extractZipFile(zipBuffer, 'manifest.json').toString('utf8'));
      expect(manifestContent.version).toBe(result.version);
      expect(manifestContent.manifest_version).toBe(3);

      // Icons check
      expect(fileNames).toContain('icons/icon-16.png');
      expect(fileNames).toContain('icons/icon-48.png');
      expect(fileNames).toContain('icons/icon-128.png');

      // Compiled JS chunks check
      const jsFiles = fileNames.filter(name => name.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);

      // Exclusions: no .map files, no test files, no src files, no dotfiles
      const forbidden = fileNames.filter(
        name =>
          name.endsWith('.map') ||
          name.includes('.test.') ||
          name.includes('.spec.') ||
          name.startsWith('src/') ||
          name.startsWith('.git') ||
          name.includes('.DS_Store')
      );
      expect(forbidden).toEqual([]);
    }, 30000);
  });
});
