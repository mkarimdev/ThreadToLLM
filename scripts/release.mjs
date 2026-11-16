#!/usr/bin/env node

/**
 * ThreadToLLM Unified Release Automation Script
 *
 * Modeled after TrioA's release architecture:
 * Automates semantic version bumps, pre-release verification, Conventional Commit
 * changelog generation, manifest synchronization (package.json + manifest.json),
 * distribution archive packaging, and Git tagging / GitHub Release publication.
 *
 * Usage:
 *   node scripts/release.mjs [patch|minor|major] [--dry-run] [--publish]
 *   npm run release -- [patch|minor|major] [--dry-run] [--publish]
 *   npm run release -- --package-only
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, '..');
export const repoRoot = process.env.RELEASE_REPO_ROOT
  ? path.resolve(process.env.RELEASE_REPO_ROOT)
  : defaultRepoRoot;

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function runGit(cmd, options = {}) {
  return execSync(`git ${cmd}`, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

export function printHeader(title) {
  console.log('\n=======================================================');
  console.log(`  ${title}`);
  console.log('=======================================================\n');
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  let isDryRun = false;
  let isPublish = false;
  let isPackageOnly = false;
  let releaseType = null;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      isDryRun = true;
    } else if (arg === '--publish') {
      isPublish = true;
    } else if (arg === '--package-only') {
      isPackageOnly = true;
    } else if (['patch', 'minor', 'major'].includes(arg.toLowerCase())) {
      releaseType = arg.toLowerCase();
    } else {
      console.error(`Error: Unrecognized argument "${arg}".`);
      printUsageAndExit(1);
    }
  }

  if (isPackageOnly) {
    return { releaseType: null, isDryRun, isPublish, isPackageOnly: true };
  }

  if (!releaseType) {
    console.error('Error: Missing required release type (patch, minor, or major).');
    printUsageAndExit(1);
  }

  return { releaseType, isDryRun, isPublish, isPackageOnly: false };
}

export function printUsageAndExit(code) {
  console.log('Usage: node scripts/release.mjs [patch|minor|major] [--dry-run] [--publish]');
  console.log('       npm run release -- [patch|minor|major] [--dry-run] [--publish]');
  console.log('       npm run release -- --package-only');
  console.log('\nOptions:');
  console.log('  patch           Bump patch version (e.g. 0.1.0 -> 0.1.1)');
  console.log('  minor           Bump minor version (e.g. 0.1.0 -> 0.2.0)');
  console.log('  major           Bump major version (e.g. 0.1.0 -> 1.0.0)');
  console.log('  --dry-run       Simulate the release without modifying files or git tags');
  console.log('  --publish       Automatically push commit, tag, and publish GitHub Release via gh CLI');
  console.log('  --package-only  Build and package distribution ZIP for current version without releasing');
  process.exit(code);
}

export function assertCleanWorkingTree() {
  if (process.env.RELEASE_IGNORE_DIRTY === '1') {
    return;
  }
  const status = runGit('status --porcelain');
  if (status.length > 0) {
    console.error('Error: Working tree is dirty. Please commit or stash changes before releasing.');
    console.error('\nUncommitted changes:\n' + status);
    process.exit(1);
  }
}

export function assertTagReachability() {
  if (process.env.RELEASE_SKIP_TAG_CHECK === '1') {
    return;
  }

  let latestRepoTag;
  try {
    const allTags = runGit('tag -l "v*" --sort=-v:refname');
    latestRepoTag = allTags.split('\n').map((t) => t.trim()).filter(Boolean)[0];
  } catch {
    return;
  }

  if (!latestRepoTag) {
    return;
  }

  try {
    runGit(`merge-base --is-ancestor "${latestRepoTag}" HEAD`);
  } catch {
    let currentBranch = 'HEAD';
    try {
      currentBranch = runGit('branch --show-current') || 'HEAD';
    } catch {
      // ignore
    }
    console.error(`\nError: The latest repository release tag (${latestRepoTag}) is not an ancestor of current branch "${currentBranch}".`);
    console.error(`Please merge or rebase onto latest release commits before cutting a release.\n`);
    process.exit(1);
  }
}

export function runVerificationChecks() {
  if (process.env.RELEASE_SKIP_VERIFY === '1') {
    console.log('ℹ️  RELEASE_SKIP_VERIFY=1 is set. Skipping verification checks.');
    return;
  }

  printHeader('Running Pre-Release Verification Checks');
  const checkCmd = process.env.RELEASE_VERIFY_CMD || 'npm run check';
  console.log(`▶ Executing Verification: ${checkCmd}`);
  try {
    execSync(checkCmd, { cwd: repoRoot, stdio: 'inherit' });
    console.log('✓ Verification checks passed cleanly.\n');
  } catch (error) {
    console.error('\nError: Pre-release verification check failed.');
    process.exit(error.status ?? 1);
  }
}

export function getCurrentVersion() {
  const pkgPath = path.join(repoRoot, 'package.json');
  const manifestPath = path.join(repoRoot, 'manifest.json');

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!pkg.version) throw new Error('package.json is missing version');
  if (!manifest.version) throw new Error('manifest.json is missing version');

  if (pkg.version !== manifest.version) {
    throw new Error(
      `Version mismatch: package.json specifies "${pkg.version}" but manifest.json specifies "${manifest.version}"`
    );
  }

  return pkg.version;
}

export function computeNextVersion(currentVersion, releaseType) {
  const semverMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/);
  if (!semverMatch) {
    throw new Error(`Current version "${currentVersion}" does not follow SemVer format (MAJOR.MINOR.PATCH).`);
  }

  let major = parseInt(semverMatch[1], 10);
  let minor = parseInt(semverMatch[2], 10);
  let patch = parseInt(semverMatch[3], 10);

  switch (releaseType) {
    case 'patch':
      patch += 1;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    default:
      throw new Error(`Unsupported release type: ${releaseType}`);
  }

  return `${major}.${minor}.${patch}`;
}

export function getCommitsSinceLastTag() {
  let range = 'HEAD';
  try {
    const lastTag = runGit('describe --tags --abbrev=0 --match "v*"');
    if (lastTag) {
      range = `${lastTag}..HEAD`;
    }
  } catch {
    // No tags exist yet; include all commits
  }

  try {
    const raw = runGit(`log --pretty=format:"%s (%h)" --no-merges ${range}`);
    if (!raw) return [];
    return raw.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function generateChangelogSection(nextVersion, commits) {
  const today = new Date().toISOString().split('T')[0];
  const groups = {
    Features: [],
    'Bug Fixes': [],
    Refactoring: [],
    Documentation: [],
    Maintenance: [],
  };

  const conventionalRegex = /^(feat|fix|perf|refactor|docs|chore|ci|test)(?:\(([^)]+)\))?!?: (.+)$/i;

  for (const commit of commits) {
    const match = commit.match(conventionalRegex);
    if (!match) {
      groups.Maintenance.push(commit);
      continue;
    }

    const type = match[1].toLowerCase();
    const scope = match[2];
    const message = match[3];

    const formatted = scope ? `**${scope}**: ${message}` : message;

    if (type === 'feat') groups.Features.push(formatted);
    else if (type === 'fix') groups['Bug Fixes'].push(formatted);
    else if (type === 'refactor' || type === 'perf') groups.Refactoring.push(formatted);
    else if (type === 'docs') groups.Documentation.push(formatted);
    else groups.Maintenance.push(formatted);
  }

  let section = `## [${nextVersion}] - ${today}\n`;
  let hasEntries = false;

  const categoryMap = [
    ['Features', '### Added'],
    ['Bug Fixes', '### Fixed'],
    ['Refactoring', '### Changed'],
    ['Documentation', '### Documentation'],
    ['Maintenance', '### Maintenance'],
  ];

  for (const [groupKey, heading] of categoryMap) {
    const items = groups[groupKey];
    if (items && items.length > 0) {
      hasEntries = true;
      section += `\n${heading}\n`;
      for (const item of items) {
        section += `- ${item}\n`;
      }
    }
  }

  if (!hasEntries) {
    section += `\n- Routine maintenance and dependency updates.\n`;
  }

  return section.trim();
}

export function updateManifests(nextVersion) {
  const updatedFiles = [];

  // 1. package.json
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  updatedFiles.push('package.json');

  // 2. manifest.json
  const manifestPath = path.join(repoRoot, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = nextVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  updatedFiles.push('manifest.json');

  return updatedFiles;
}

export function updateChangelog(changelogSection) {
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  const baseContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n## [Unreleased]\n\n';

  const unreleasedMarker = '## [Unreleased]';
  const unreleasedIdx = baseContent.indexOf(unreleasedMarker);
  let content;

  if (unreleasedIdx !== -1) {
    const afterUnreleased = unreleasedIdx + unreleasedMarker.length;
    const before = baseContent.slice(0, afterUnreleased);
    const after = baseContent.slice(afterUnreleased).trimStart();
    content = `${before}\n\n${changelogSection}\n\n${after}`;
  } else {
    const firstVersionHeader = baseContent.indexOf('## [');
    if (firstVersionHeader !== -1) {
      const before = baseContent.slice(0, firstVersionHeader);
      const after = baseContent.slice(firstVersionHeader);
      content = `${before}${changelogSection}\n\n${after}`;
    } else {
      content = `${baseContent.trim()}\n\n${changelogSection}\n`;
    }
  }

  fs.writeFileSync(changelogPath, content, 'utf8');
  return 'CHANGELOG.md';
}

/**
 * Validates declared icons in manifest.json.
 */
export function validateDeclaredIcons(manifestPath, publicDir) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const iconPaths = new Set();

  if (manifest.icons && typeof manifest.icons === 'object') {
    for (const size of Object.keys(manifest.icons)) {
      iconPaths.add(manifest.icons[size]);
    }
  }

  if (manifest.action?.default_icon) {
    if (typeof manifest.action.default_icon === 'string') {
      iconPaths.add(manifest.action.default_icon);
    } else if (typeof manifest.action.default_icon === 'object') {
      for (const size of Object.keys(manifest.action.default_icon)) {
        iconPaths.add(manifest.action.default_icon[size]);
      }
    }
  }

  const results = [];
  for (const relPath of iconPaths) {
    const fullPath = path.join(publicDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Declared icon asset not found: ${fullPath}`);
    }
    const buf = fs.readFileSync(fullPath);
    if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_HEADER)) {
      throw new Error(`Declared icon is not a valid PNG file: ${fullPath}`);
    }
    results.push({ relativePath: relPath, fullPath });
  }

  return results;
}

/**
 * Creates a standard PKZIP archive buffer in pure Node.js.
 */
export function createZipArchive(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');
    const contentBuf = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, 'utf8');

    const crc = zlib.crc32(contentBuf);
    const compressed = zlib.deflateRawSync(contentBuf);

    // Local file header (30 bytes + filename)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4);         // version needed (2.0)
    lh.writeUInt16LE(0, 6);          // flags
    lh.writeUInt16LE(8, 8);          // compression method (deflate)
    lh.writeUInt16LE(0, 10);         // last mod time
    lh.writeUInt16LE(0, 12);         // last mod date
    lh.writeUInt32LE(crc, 14);       // crc32
    lh.writeUInt32LE(compressed.length, 18); // compressed size
    lh.writeUInt32LE(contentBuf.length, 22); // uncompressed size
    lh.writeUInt16LE(filenameBuf.length, 26); // filename length
    lh.writeUInt16LE(0, 28);         // extra field length

    localHeaders.push(lh, filenameBuf, compressed);

    // Central directory header (46 bytes + filename)
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4);         // version made by
    cd.writeUInt16LE(20, 6);         // version needed
    cd.writeUInt16LE(0, 8);          // flags
    cd.writeUInt16LE(8, 10);         // compression method
    cd.writeUInt16LE(0, 12);         // last mod time
    cd.writeUInt16LE(0, 14);         // last mod date
    cd.writeUInt32LE(crc, 16);       // crc32
    cd.writeUInt32LE(compressed.length, 20); // compressed size
    cd.writeUInt32LE(contentBuf.length, 24); // uncompressed size
    cd.writeUInt16LE(filenameBuf.length, 28); // filename length
    cd.writeUInt16LE(0, 30);         // extra field length
    cd.writeUInt16LE(0, 32);         // comment length
    cd.writeUInt16LE(0, 34);         // disk number start
    cd.writeUInt16LE(0, 36);         // internal file attributes
    cd.writeUInt32LE(0x81a40000, 38); // external file attributes (-rw-r--r--)
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
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // disk start
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12);    // cd size
  eocd.writeUInt32LE(cdStart, 16);   // cd offset
  eocd.writeUInt16LE(0, 20);         // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function collectDirectoryFiles(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push(...collectDirectoryFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (
        relativePath.endsWith('.map') ||
        relativePath.includes('.test.') ||
        relativePath.includes('.spec.') ||
        relativePath.startsWith('.')
      ) {
        continue;
      }
      results.push({ relativePath, fullPath });
    }
  }

  return results;
}

export function buildAndPackageZip(version, options = {}) {
  const rootDir = options.rootDir || repoRoot;
  const distDir = path.join(rootDir, 'dist');
  const outDir = path.join(rootDir, 'dist-zip');
  const silent = Boolean(options.silent);
  const skipBuild = Boolean(options.skipBuild);

  const manifestPath = path.join(rootDir, 'manifest.json');
  const publicDir = path.join(rootDir, 'public');

  validateDeclaredIcons(manifestPath, publicDir);

  if (!skipBuild || !fs.existsSync(distDir)) {
    if (!silent) {
      console.log('Building extension with production configuration...');
    }
    execSync('npm run build', {
      cwd: rootDir,
      stdio: silent ? 'pipe' : 'inherit',
    });
  }

  if (!fs.existsSync(distDir)) {
    throw new Error(`Production distribution directory not found: ${distDir}`);
  }

  const distFiles = collectDirectoryFiles(distDir);
  const zipEntries = distFiles.map((file) => ({
    name: file.relativePath,
    content: fs.readFileSync(file.fullPath),
  }));

  const zipBuffer = createZipArchive(zipEntries);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const zipFilename = `thread-to-llm-v${version}.zip`;
  const zipPath = path.join(outDir, zipFilename);
  const rootZipPath = path.join(rootDir, zipFilename);

  fs.writeFileSync(zipPath, zipBuffer);
  fs.writeFileSync(rootZipPath, zipBuffer);

  return {
    version,
    zipPath,
    rootZipPath,
    fileCount: zipEntries.length,
    zipSize: zipBuffer.length,
  };
}

export function main() {
  const { releaseType, isDryRun, isPublish, isPackageOnly } = parseCliArgs();

  // Package-only convenience flow
  if (isPackageOnly) {
    printHeader('Packaging Distribution Archive');
    const version = getCurrentVersion();
    const pkg = buildAndPackageZip(version);
    console.log(`✓ Packaged ${pkg.fileCount} files into ${pkg.zipPath} (${pkg.zipSize} bytes)`);
    console.log(`✓ Mirrored at ${pkg.rootZipPath}`);
    process.exit(0);
  }

  // 1. Assert clean working tree
  assertCleanWorkingTree();

  // 2. Assert latest release tag is reachable
  assertTagReachability();

  // 3. Compute next SemVer
  const currentVersion = getCurrentVersion();
  const nextVersion = computeNextVersion(currentVersion, releaseType);

  // 4. Generate changelog section
  const commits = getCommitsSinceLastTag();
  const changelogSection = generateChangelogSection(nextVersion, commits);

  // 5. Handle Dry-Run
  if (isDryRun) {
    printHeader('ThreadToLLM Release Automation (DRY-RUN)');
    console.log(`Current Version : ${currentVersion}`);
    console.log(`Next Version    : ${nextVersion}`);
    console.log(`Release Type    : ${releaseType}\n`);
    console.log('Generated Changelog Entry:');
    console.log('-------------------------------------------------------');
    console.log(changelogSection);
    console.log('-------------------------------------------------------');
    console.log('\n[DRY-RUN] Release dry run completed successfully.');
    console.log('[DRY-RUN] No files were modified, no commits or git tags created.\n');
    process.exit(0);
  }

  // 6. Run verification checks in real release mode
  runVerificationChecks();

  // 7. Update manifests and CHANGELOG.md
  printHeader(`Cutting Release v${nextVersion}`);
  const updatedManifests = updateManifests(nextVersion);
  const updatedChangelog = updateChangelog(changelogSection);
  const allUpdatedFiles = [...updatedManifests, updatedChangelog];

  console.log('Updated manifests & changelog:');
  for (const f of allUpdatedFiles) {
    console.log(`  - ${f}`);
  }

  // 8. Build & Package extension distribution ZIP
  printHeader('Packaging Production Extension ZIP');
  const pkgResult = buildAndPackageZip(nextVersion);
  console.log(`✓ Packaged ${pkgResult.fileCount} files into ${pkgResult.zipPath} (${pkgResult.zipSize} bytes)`);

  // 9. Git commit and tag
  for (const f of allUpdatedFiles) {
    runGit(`add "${f}"`);
  }

  const commitMsg = `chore(release): v${nextVersion}`;
  runGit(`commit -m "${commitMsg}"`);
  console.log(`\n✓ Committed release changes: "${commitMsg}"`);

  const tagMsg = `Release v${nextVersion}`;
  runGit(`tag -a "v${nextVersion}" -m "${tagMsg}"`);
  console.log(`✓ Created annotated git tag: "v${nextVersion}"`);

  // 10. Publish to GitHub or display manual instructions
  if (isPublish) {
    printHeader(`Publishing Release v${nextVersion} to GitHub`);
    try {
      const currentBranch = runGit('branch --show-current');
      console.log(`▶ Pushing release commit on "${currentBranch}" to origin...`);
      runGit(`push origin ${currentBranch}`);

      console.log(`▶ Pushing git tag "v${nextVersion}" to origin...`);
      runGit(`push origin "v${nextVersion}"`);

      console.log('▶ Creating GitHub Release via gh CLI...');
      const tempNotesPath = path.join(repoRoot, '.temp_release_notes.md');
      fs.writeFileSync(tempNotesPath, changelogSection, 'utf-8');
      try {
        const assetArg = `${pkgResult.zipPath}#${path.basename(pkgResult.zipPath)}`;
        execSync(
          `gh release create "v${nextVersion}" -t "v${nextVersion}" -F "${tempNotesPath}" "${assetArg}"`,
          {
            cwd: repoRoot,
            stdio: 'inherit',
          }
        );
        console.log(`\n🎉 Release v${nextVersion} published successfully to GitHub!`);
      } finally {
        if (fs.existsSync(tempNotesPath)) {
          fs.unlinkSync(tempNotesPath);
        }
      }
    } catch (err) {
      console.error(`\nFailed to publish to GitHub: ${err.message}`);
      console.log('You can publish manually using the commands below:\n');
      printManualInstructions(nextVersion, pkgResult.zipPath);
    }
  } else {
    printHeader(`Release v${nextVersion} Ready`);
    printManualInstructions(nextVersion, pkgResult.zipPath);
  }
}

export function printManualInstructions(nextVersion, zipPath) {
  console.log('Next steps to publish release to GitHub:');
  console.log('  1. Push release commit and tag to origin:');
  console.log('     git push origin master');
  console.log(`     git push origin v${nextVersion}\n`);
  console.log('  2. Create GitHub Release with the packaged ZIP asset:');
  console.log(`     gh release create v${nextVersion} "${zipPath}" --title "v${nextVersion}"\n`);
}

// Auto-run if executed as script
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
