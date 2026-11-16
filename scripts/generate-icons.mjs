/**
 * ThreadToLLM - Extension Icon Generator
 *
 * Programmatically generates crisp, minimalist branded PNG icons for sizes 16x16, 48x48, and 128x128.
 * Visual Motif:
 * - Rounded squircle dark slate tile (#0f172a to #1e293b) matching toast and dark UI theme.
 * - Conversation thread / speech bubble with Reddit-orange accent (#ff4500) tail morphing into a clean white document card.
 * - Indented structured Markdown hierarchy lines (#3b82f6 header, #64748b, #0ea5e9, #94a3b8 thread comments).
 * - Radiant 4-pointed AI sparkles (#fbbf24 amber star) in top-right corner.
 *
 * Uses pure Node.js (zlib + Buffer) with zero external dependencies for maximum cross-platform reliability.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a PNG chunk with length, chunk type, chunk data, and CRC-32.
 */
function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crc = zlib.crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([lenBuf, crcData, crcBuf]);
}

/**
 * Encodes an RGBA pixel buffer into a valid PNG buffer.
 */
export function encodePng(width, height, rgbaBuffer) {
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rawOffset = y * scanlineLength;
    rawData[rawOffset] = 0; // Filter method: 0 (None)
    rgbaBuffer.copy(rawData, rawOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk: width (4), height (4), depth (1), colorType (1=RGBA:6), comp (1=0), filter (1=0), interlace (1=0)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Compression: deflate
  ihdr[11] = 0; // Filter method: 0
  ihdr[12] = 0; // Interlace: 0

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Reads and verifies dimensions from a PNG buffer.
 */
export function parsePngDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    throw new Error('Invalid PNG buffer: buffer too short');
  }
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG buffer: invalid PNG signature');
  }
  const chunkType = buffer.toString('ascii', 12, 16);
  if (chunkType !== 'IHDR') {
    throw new Error(`Invalid PNG buffer: expected IHDR chunk, got ${chunkType}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

// 2D Vector & SDF Helpers
function insideTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
}

function sdRoundedBox(px, py, cx, cy, w, h, r) {
  const dx = Math.abs(px - cx) - (w / 2 - r);
  const dy = Math.abs(py - cy) - (h / 2 - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

function insideAstroidStar(px, py, cx, cy, r) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  if (dx > r || dy > r) return false;
  return (Math.sqrt(dx) + Math.sqrt(dy)) <= Math.sqrt(r);
}

/**
 * Samples RGBA color at normalized coordinates (u, v) in [0, 1].
 */
function sampleColor(u, v) {
  // 1. Primary AI sparkle (top right)
  if (insideAstroidStar(u, v, 0.77, 0.22, 0.16)) {
    const dist = Math.hypot(u - 0.77, v - 0.22);
    if (dist < 0.04) {
      return [254, 240, 138, 255]; // Luminous star center (#fef08a)
    }
    return [251, 191, 36, 255]; // Amber sparkle (#fbbf24)
  }

  // Secondary micro-sparkle
  if (insideAstroidStar(u, v, 0.88, 0.38, 0.07)) {
    return [251, 191, 36, 220];
  }

  // 2. Structured Markdown lines on the document card
  // Header line (Token blue #3b82f6)
  if (sdRoundedBox(u, v, 0.50, 0.35, 0.32, 0.05, 0.02) <= 0) {
    return [59, 130, 246, 255];
  }
  // Line 1: Parent comment (#64748b)
  if (sdRoundedBox(u, v, 0.48, 0.45, 0.28, 0.04, 0.015) <= 0) {
    return [100, 116, 139, 255];
  }
  // Line 2: Indented thread comment 1 (#0ea5e9)
  if (sdRoundedBox(u, v, 0.53, 0.55, 0.24, 0.04, 0.015) <= 0) {
    return [14, 165, 233, 255];
  }
  // Line 3: Indented thread comment 2 (#94a3b8)
  if (sdRoundedBox(u, v, 0.55, 0.65, 0.20, 0.04, 0.015) <= 0) {
    return [148, 163, 184, 255];
  }

  // 3. Conversation Speech Bubble Tail (Reddit orange #ff4500)
  const inTail = insideTriangle(u, v, 0.30, 0.65, 0.30, 0.86, 0.13, 0.86);
  if (inTail) {
    return [255, 69, 0, 255];
  }

  // 4. Document Card Body (morphing from bubble to clean document)
  const inCard = sdRoundedBox(u, v, 0.49, 0.51, 0.48, 0.48, 0.08) <= 0;
  if (inCard) {
    // Left edge retains conversation accent
    if (u < 0.30) {
      return [255, 69, 0, 255];
    }
    return [248, 250, 252, 255]; // Clean document white (#f8fafc)
  }

  // 5. Dark Base Squircle Tile
  const dTile = sdRoundedBox(u, v, 0.5, 0.5, 0.90, 0.90, 0.18);
  if (dTile <= 0) {
    // Subtle border stroke
    if (dTile > -0.02) {
      return [51, 65, 85, 255]; // #334155
    }
    // Gradient dark slate background (#0f172a to #1e293b)
    const t = v;
    const r = Math.round(15 + t * 15);
    const g = Math.round(23 + t * 18);
    const b = Math.round(42 + t * 17);
    return [r, g, b, 255];
  }

  // Outside tile: transparent
  return [0, 0, 0, 0];
}

/**
 * Generates an icon PNG Buffer for a specific pixel size.
 * Uses 4x supersampling for smooth anti-aliased geometry.
 */
export function generateIcon(size) {
  const rgbaBuffer = Buffer.alloc(size * size * 4);
  const subSamples = 4;
  const count = subSamples * subSamples;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let totalA = 0;

      for (let sy = 0; sy < subSamples; sy++) {
        for (let sx = 0; sx < subSamples; sx++) {
          const u = (x + (sx + 0.5) / subSamples) / size;
          const v = (y + (sy + 0.5) / subSamples) / size;
          const [r, g, b, a] = sampleColor(u, v);
          const alphaFrac = a / 255;
          totalR += r * alphaFrac;
          totalG += g * alphaFrac;
          totalB += b * alphaFrac;
          totalA += a;
        }
      }

      const avgA = totalA / count;
      const idx = (y * size + x) * 4;

      if (avgA > 0) {
        const factor = totalA / 255;
        rgbaBuffer[idx] = Math.round(totalR / factor);
        rgbaBuffer[idx + 1] = Math.round(totalG / factor);
        rgbaBuffer[idx + 2] = Math.round(totalB / factor);
        rgbaBuffer[idx + 3] = Math.round(avgA);
      } else {
        rgbaBuffer[idx] = 0;
        rgbaBuffer[idx + 1] = 0;
        rgbaBuffer[idx + 2] = 0;
        rgbaBuffer[idx + 3] = 0;
      }
    }
  }

  return encodePng(size, size, rgbaBuffer);
}

/**
 * Generates all standard extension icon sizes into target directory.
 */
export function generateAllIcons(outputDir = path.resolve(__dirname, '../public/icons')) {
  const sizes = [16, 48, 128];
  fs.mkdirSync(outputDir, { recursive: true });
  const results = [];

  for (const size of sizes) {
    const pngBuffer = generateIcon(size);
    const fileName = `icon-${size}.png`;
    const targetPath = path.join(outputDir, fileName);
    fs.writeFileSync(targetPath, pngBuffer);
    results.push({ size, path: targetPath, bytes: pngBuffer.length });
  }

  return results;
}

// CLI Execution entry point
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectExecution) {
  const outputDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../public/icons');
  console.log(`Generating ThreadToLLM extension icons in: ${outputDir}`);
  const generated = generateAllIcons(outputDir);
  for (const item of generated) {
    console.log(`  ✓ Generated ${item.size}x${item.size} PNG (${item.bytes} bytes): ${item.path}`);
  }
}
