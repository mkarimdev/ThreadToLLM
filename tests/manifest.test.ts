import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Manifest V3 Configuration', () => {
  const manifestPath = path.resolve(__dirname, '../manifest.json');

  it('manifest.json exists and is valid JSON', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('specifies manifest_version 3', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
  });

  it('requests minimal permissions: only clipboardWrite', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.permissions).toEqual(['clipboardWrite']);
  });

  it('requests host permissions only for reddit.com', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.host_permissions).toEqual(['*://*.reddit.com/*']);
  });

  it('registers content script for reddit.com', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    expect(manifest.content_scripts[0].matches).toContain('*://*.reddit.com/*');
    expect(manifest.content_scripts[0].js).toBeDefined();
    expect(manifest.content_scripts[0].js.length).toBeGreaterThan(0);
  });
});
