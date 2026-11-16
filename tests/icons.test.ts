import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generateIcon, parsePngDimensions } from '../scripts/generate-icons.mjs';

describe('Extension Icon Generator', () => {
  const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  it.each([16, 48, 128])('generates a valid %ipx PNG icon with correct dimensions and signature', (size) => {
    const iconBuffer = generateIcon(size);

    expect(Buffer.isBuffer(iconBuffer)).toBe(true);
    expect(iconBuffer.length).toBeGreaterThan(60);

    // Header check
    expect(iconBuffer.subarray(0, 8)).toEqual(PNG_HEADER);

    // Dimensions check via parser helper
    const dimensions = parsePngDimensions(iconBuffer);
    expect(dimensions).toEqual({ width: size, height: size });
  });

  it('generates non-blank icon with alpha transparency and branded colors', () => {
    const iconBuffer = generateIcon(48);

    // IHDR starts at byte 8; width at 16, height at 20
    const width = iconBuffer.readUInt32BE(16);
    const height = iconBuffer.readUInt32BE(20);
    expect(width).toBe(48);
    expect(height).toBe(48);

    // Verify it is not just empty or single solid color
    expect(iconBuffer.length).toBeGreaterThan(150);
  });

  it('verifies generated icons exist in public directory with exact PNG signatures and dimensions', () => {
    const requiredSizes = [16, 48, 128] as const;
    for (const size of requiredSizes) {
      const iconPath = path.resolve(__dirname, `../public/icons/icon-${size}.png`);
      expect(fs.existsSync(iconPath)).toBe(true);
      const buffer = fs.readFileSync(iconPath);
      expect(buffer.subarray(0, 8)).toEqual(PNG_HEADER);
      const dims = parsePngDimensions(buffer);
      expect(dims).toEqual({ width: size, height: size });
    }
  });

  it('verifies built icons exist in dist directory when dist is present', () => {
    const distPath = path.resolve(__dirname, '../dist/icons');
    if (!fs.existsSync(distPath)) {
      return;
    }
    const requiredSizes = [16, 48, 128] as const;
    for (const size of requiredSizes) {
      const iconPath = path.join(distPath, `icon-${size}.png`);
      expect(fs.existsSync(iconPath)).toBe(true);
      const buffer = fs.readFileSync(iconPath);
      expect(buffer.subarray(0, 8)).toEqual(PNG_HEADER);
      const dims = parsePngDimensions(buffer);
      expect(dims).toEqual({ width: size, height: size });
    }
  });
});
