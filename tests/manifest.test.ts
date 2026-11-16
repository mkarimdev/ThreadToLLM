import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Manifest V3 Configuration', () => {
  const manifestPath = path.resolve(__dirname, '../manifest.json');
  const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestRaw);

  it('manifest.json exists and is valid JSON', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(() => JSON.parse(manifestRaw)).not.toThrow();
  });

  it('specifies manifest_version 3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it('requests minimal permissions: only clipboardWrite', () => {
    expect(manifest.permissions).toEqual(['clipboardWrite']);
  });

  it('requests host permissions only for reddit.com', () => {
    expect(manifest.host_permissions).toEqual(['*://*.reddit.com/*']);
  });

  it('registers content script for reddit.com', () => {
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    expect(manifest.content_scripts[0].matches).toContain('*://*.reddit.com/*');
    expect(manifest.content_scripts[0].js).toBeDefined();
    expect(manifest.content_scripts[0].js.length).toBeGreaterThan(0);
  });

  it('registers keyboard shortcut Alt+Shift+C in commands', () => {
    expect(manifest.commands).toBeDefined();
    expect(manifest.commands['copy-thread']).toBeDefined();
    expect(manifest.commands['copy-thread'].suggested_key.default).toBe('Alt+Shift+C');
    expect(manifest.commands['copy-thread'].suggested_key.mac).toBe('Alt+Shift+C');
  });

  it('registers background service worker as ES module', () => {
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBe('src/extension/background.ts');
    expect(manifest.background.type).toBe('module');
  });

  it('registers extension icons for 16, 48, and 128px', () => {
    expect(manifest.icons).toEqual({
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    });
  });

  it('registers action with default_icon matching extension icons', () => {
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_icon).toEqual({
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    });
  });

  it('declares icon files that exist in public directory with valid PNG signature and exact dimensions', () => {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const requiredSizes = [16, 48, 128] as const;

    expect(manifest.icons).toBeDefined();
    for (const size of requiredSizes) {
      const relativePath = manifest.icons[size.toString()];
      expect(relativePath).toBeDefined();
      const fullPath = path.resolve(__dirname, '..', 'public', relativePath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const buffer = fs.readFileSync(fullPath);
      expect(buffer.length).toBeGreaterThan(24);

      // Verify PNG magic signature
      expect(buffer.subarray(0, 8)).toEqual(pngSignature);

      // Verify width and height from IHDR chunk (bytes 16-23)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      expect(width).toBe(size);
      expect(height).toBe(size);
    }
  });
});
