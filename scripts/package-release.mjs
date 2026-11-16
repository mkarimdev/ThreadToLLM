/**
 * ThreadToLLM - Automated Release Packaging & Verification
 *
 * Validates version parity between package.json and manifest.json,
 * asserts that all declared icon assets exist and conform to PNG standards,
 * executes the production build, and generates clean distribution ZIP archives
 * containing production extension assets without dev or test artifacts.
 *
 * Uses zero external dependencies (pure Node.js standard library).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import { execSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Asserts that package.json and manifest.json version strings match exactly.
 *
 * @param {string} [packageJsonPath]
 * @param {string} [manifestPath]
 * @returns {string} The verified version string
 */
export function validateVersionParity(
  packageJsonPath = path.join(DEFAULT_ROOT, 'package.json'),
  manifestPath = path.join(DEFAULT_ROOT, 'manifest.json')
) {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!pkg.version) {
    throw new Error(`package.json is missing a "version" property: ${packageJsonPath}`);
  }
  if (!manifest.version) {
    throw new Error(`manifest.json is missing a "version" property: ${manifestPath}`);
  }

  if (pkg.version !== manifest.version) {
    throw new Error(
      `Version mismatch: package.json specifies "${pkg.version}" but manifest.json specifies "${manifest.version}"`
    );
  }

  return pkg.version;
}

/**
 * Validates that all icons declared in manifest.json exist on disk,
 * are valid PNG files, and match expected dimensions.
 *
 * @param {string} [manifestPath]
 * @param {string} [publicDir]
 * @returns {Array<{ key: string, relativePath: string, fullPath: string, width: number, height: number, bytes: number }>}
 */
export function validateDeclaredIcons(
  manifestPath = path.join(DEFAULT_ROOT, 'manifest.json'),
  publicDir = path.join(DEFAULT_ROOT, 'public')
) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const iconDeclarations = new Map();

  if (manifest.icons && typeof manifest.icons === 'object') {
    for (const [key, relPath] of Object.entries(manifest.icons)) {
      iconDeclarations.set(key, relPath);
    }
  }

  if (manifest.action && manifest.action.default_icon && typeof manifest.action.default_icon === 'object') {
    for (const [key, relPath] of Object.entries(manifest.action.default_icon)) {
      if (!iconDeclarations.has(key)) {
        iconDeclarations.set(key, relPath);
      }
    }
  }

  if (iconDeclarations.size === 0) {
    throw new Error(`No icons declared in manifest.json: ${manifestPath}`);
  }

  const validated = [];

  for (const [key, relPath] of iconDeclarations.entries()) {
    const fullPath = path.resolve(publicDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Declared icon file does not exist on disk: ${fullPath} (manifest key: ${key})`);
    }

    const buffer = fs.readFileSync(fullPath);
    if (buffer.length < 24) {
      throw new Error(`Declared icon file is too small or empty: ${fullPath} (${buffer.length} bytes)`);
    }

    // Verify PNG magic signature
    if (!buffer.subarray(0, 8).equals(PNG_HEADER)) {
      throw new Error(`Declared icon file does not have a valid PNG signature: ${fullPath}`);
    }

    // IHDR dimensions: width at byte 16, height at byte 20 (big-endian uint32)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    const expectedSize = parseInt(key, 10);
    if (!Number.isNaN(expectedSize)) {
      if (width !== expectedSize || height !== expectedSize) {
        throw new Error(
          `Icon dimensions for key "${key}" do not match declared size: expected ${expectedSize}x${expectedSize}, got ${width}x${height} in ${fullPath}`
        );
      }
    }

    validated.push({
      key,
      relativePath: relPath,
      fullPath,
      width,
      height,
      bytes: buffer.length,
    });
  }

  return validated;
}

/**
 * Creates a standard PKZIP archive buffer in memory.
 *
 * @param {Array<{ name: string, content: Buffer | string, date?: Date }>} files
 * @returns {Buffer}
 */
export function createZipArchive(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const normalizedName = file.name.replace(/\\/g, '/').replace(/^\/+/, '');
    const filenameBuf = Buffer.from(normalizedName, 'utf8');
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
    const compressed = zlib.deflateRawSync(content);
    const crc = zlib.crc32(content);

    const date = file.date || new Date();
    const dosTime = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
    const dosDate = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;

    // Local file header (30 bytes)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4);         // version needed (2.0)
    lh.writeUInt16LE(0x0800, 6);     // UTF-8 filename flag
    lh.writeUInt16LE(8, 8);          // compression method (deflate)
    lh.writeUInt16LE(dosTime, 10);   // mod time
    lh.writeUInt16LE(dosDate, 12);   // mod date
    lh.writeUInt32LE(crc >>> 0, 14); // crc-32
    lh.writeUInt32LE(compressed.length, 18); // compressed size
    lh.writeUInt32LE(content.length, 22);    // uncompressed size
    lh.writeUInt16LE(filenameBuf.length, 26); // filename length
    lh.writeUInt16LE(0, 28);         // extra field length

    localHeaders.push(lh, filenameBuf, compressed);

    // Central directory header (46 bytes)
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4);         // version made by
    cd.writeUInt16LE(20, 6);         // version needed
    cd.writeUInt16LE(0x0800, 8);     // UTF-8 flag
    cd.writeUInt16LE(8, 10);         // deflate method
    cd.writeUInt16LE(dosTime, 12);   // mod time
    cd.writeUInt16LE(dosDate, 14);   // mod date
    cd.writeUInt32LE(crc >>> 0, 16); // crc-32
    cd.writeUInt32LE(compressed.length, 20); // compressed size
    cd.writeUInt32LE(content.length, 24);    // uncompressed size
    cd.writeUInt16LE(filenameBuf.length, 28); // filename length
    cd.writeUInt16LE(0, 30);         // extra field length
    cd.writeUInt16LE(0, 32);         // comment length
    cd.writeUInt16LE(0, 34);         // disk number start
    cd.writeUInt16LE(0, 36);         // internal file attributes
    cd.writeUInt32LE(0x81a40000, 38); // external file attributes (regular file -rw-r--r--)
    cd.writeUInt32LE(offset, 42);    // relative offset of local header

    centralHeaders.push(cd, filenameBuf);

    offset += 30 + filenameBuf.length + compressed.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const b of centralHeaders) {
    cdSize += b.length;
  }

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // EOCD signature
  eocd.writeUInt16LE(0, 4);                // disk number
  eocd.writeUInt16LE(0, 6);                // disk start
  eocd.writeUInt16LE(files.length, 8);     // entries on this disk
  eocd.writeUInt16LE(files.length, 10);    // total entries
  eocd.writeUInt32LE(cdSize, 12);          // central directory size
  eocd.writeUInt32LE(cdStart, 16);         // central directory offset
  eocd.writeUInt16LE(0, 20);               // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * Parses central directory entries from a ZIP buffer.
 *
 * @param {Buffer} zipBuffer
 * @returns {Array<{ name: string, method: number, crc32: number, compressedSize: number, uncompressedSize: number, localHeaderOffset: number }>}
 */
export function parseZipEntries(zipBuffer) {
  let eocdOffset = -1;
  const minScan = Math.max(0, zipBuffer.length - 65557);

  for (let i = zipBuffer.length - 22; i >= minScan; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP buffer: EOCD signature not found');
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  const entries = [];
  let cursor = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    const sig = zipBuffer.readUInt32LE(cursor);
    if (sig !== 0x02014b50) {
      throw new Error(`Invalid Central Directory header signature at offset ${cursor}`);
    }

    const method = zipBuffer.readUInt16LE(cursor + 10);
    const crc = zipBuffer.readUInt32LE(cursor + 16);
    const compressedSize = zipBuffer.readUInt32LE(cursor + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(cursor + 24);
    const filenameLen = zipBuffer.readUInt16LE(cursor + 28);
    const extraLen = zipBuffer.readUInt16LE(cursor + 30);
    const commentLen = zipBuffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(cursor + 42);

    const name = zipBuffer.toString('utf8', cursor + 46, cursor + 46 + filenameLen);

    entries.push({
      name,
      method,
      crc32: crc,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    cursor += 46 + filenameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Extracts and uncompresses a single file from a ZIP buffer by name.
 *
 * @param {Buffer} zipBuffer
 * @param {string} targetName
 * @returns {Buffer}
 */
export function extractZipFile(zipBuffer, targetName) {
  const entries = parseZipEntries(zipBuffer);
  const entry = entries.find((e) => e.name === targetName);
  if (!entry) {
    throw new Error(`File not found in ZIP archive: ${targetName}`);
  }

  const lhOffset = entry.localHeaderOffset;
  const lhSig = zipBuffer.readUInt32LE(lhOffset);
  if (lhSig !== 0x04034b50) {
    throw new Error(`Invalid Local Header signature at offset ${lhOffset}`);
  }

  const lhFilenameLen = zipBuffer.readUInt16LE(lhOffset + 26);
  const lhExtraLen = zipBuffer.readUInt16LE(lhOffset + 28);
  const dataOffset = lhOffset + 30 + lhFilenameLen + lhExtraLen;
  const compressedData = zipBuffer.subarray(dataOffset, dataOffset + entry.compressedSize);

  let uncompressed;
  if (entry.method === 0) {
    uncompressed = compressedData;
  } else if (entry.method === 8) {
    uncompressed = zlib.inflateRawSync(compressedData);
  } else {
    throw new Error(`Unsupported compression method in ZIP entry: ${entry.method}`);
  }

  const actualCrc = zlib.crc32(uncompressed);
  if (actualCrc !== entry.crc32) {
    throw new Error(`CRC mismatch for ZIP entry "${targetName}": expected ${entry.crc32}, got ${actualCrc}`);
  }

  return uncompressed;
}

/**
 * Recursively scans a directory and collects all files, omitting ignored patterns.
 *
 * @param {string} dir
 * @param {string} baseDir
 * @returns {Array<{ relativePath: string, fullPath: string }>}
 */
function collectDirectoryFiles(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    // Filter out source maps, test files, and hidden/system files
    if (
      entry.name.startsWith('.') ||
      relPath.endsWith('.map') ||
      relPath.includes('.test.') ||
      relPath.includes('.spec.')
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...collectDirectoryFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push({ relativePath: relPath, fullPath });
    }
  }

  return results;
}

/**
 * Executes the full release packaging pipeline.
 *
 * @param {object} [options]
 * @param {string} [options.rootDir]
 * @param {string} [options.distDir]
 * @param {string} [options.outDir]
 * @param {boolean} [options.skipBuild]
 * @param {boolean} [options.silent]
 * @returns {{ version: string, zipPath: string, rootZipPath: string, fileCount: number, zipSize: number, files: string[] }}
 */
export function packageRelease(options = {}) {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : DEFAULT_ROOT;
  const distDir = options.distDir ? path.resolve(options.distDir) : path.join(rootDir, 'dist');
  const outDir = options.outDir ? path.resolve(options.outDir) : path.join(rootDir, 'dist-zip');
  const skipBuild = Boolean(options.skipBuild);
  const silent = Boolean(options.silent);

  const log = (...args) => {
    if (!silent) {
      console.log(...args);
    }
  };

  const packageJsonPath = path.join(rootDir, 'package.json');
  const manifestPath = path.join(rootDir, 'manifest.json');
  const publicDir = path.join(rootDir, 'public');

  // Step 1: Version parity verification
  const version = validateVersionParity(packageJsonPath, manifestPath);
  log(`✓ Version parity verified: v${version}`);

  // Step 2: Validate declared icons
  const declaredIcons = validateDeclaredIcons(manifestPath, publicDir);
  log(`✓ Verified ${declaredIcons.length} declared extension icon assets`);

  // Step 3: Execute production build if not explicitly skipped
  if (!skipBuild) {
    log(`Building extension with production configuration...`);
    execSync('npm run build', {
      cwd: rootDir,
      stdio: silent ? 'pipe' : 'inherit',
    });
  }

  if (!fs.existsSync(distDir)) {
    throw new Error(`Production distribution directory not found: ${distDir}`);
  }

  // Step 4: Collect files to package from dist
  const distFiles = collectDirectoryFiles(distDir);
  const relativeFileNames = distFiles.map((f) => f.relativePath);

  // Assert essential files exist in dist
  if (!relativeFileNames.includes('manifest.json')) {
    throw new Error(`dist/manifest.json is missing after production build`);
  }

  const hasJsChunks = relativeFileNames.some((f) => f.endsWith('.js'));
  if (!hasJsChunks) {
    throw new Error(`No compiled JavaScript bundles found in ${distDir}`);
  }

  // Assert declared icons exist in dist
  for (const icon of declaredIcons) {
    if (!relativeFileNames.includes(icon.relativePath)) {
      throw new Error(`Declared icon ${icon.relativePath} is missing in ${distDir}`);
    }
  }

  const filesToZip = distFiles.map((file) => ({
    name: file.relativePath,
    content: fs.readFileSync(file.fullPath),
  }));

  // Step 5: Create ZIP archive buffer
  const zipBuffer = createZipArchive(filesToZip);

  // Step 6: Write to output directories
  fs.mkdirSync(outDir, { recursive: true });
  const archiveName = `thread-to-llm-v${version}.zip`;
  const zipPath = path.join(outDir, archiveName);
  const rootZipPath = path.join(rootDir, archiveName);

  fs.writeFileSync(zipPath, zipBuffer);
  fs.writeFileSync(rootZipPath, zipBuffer);

  log(`✓ Successfully packaged ${filesToZip.length} files into ${zipPath} (${zipBuffer.length} bytes)`);
  log(`✓ Distribution archive also mirrored at root: ${rootZipPath}`);

  return {
    version,
    zipPath,
    rootZipPath,
    fileCount: filesToZip.length,
    zipSize: zipBuffer.length,
    files: relativeFileNames,
  };
}

// CLI execution entry point
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectExecution) {
  try {
    packageRelease();
  } catch (error) {
    console.error('Packaging failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
