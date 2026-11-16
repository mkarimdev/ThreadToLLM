/**
 * ThreadToLLM - Automated SemVer Changelog Generator
 *
 * Generates and updates CHANGELOG.md according to the "Keep a Changelog" standard
 * and Semantic Versioning specifications using Conventional Commits from git history.
 *
 * Zero external dependencies (pure Node.js standard library).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

const CHANGELOG_HEADER = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
`;

/**
 * @typedef {Object} ParsedCommit
 * @property {string} hash
 * @property {string} raw
 * @property {string} type
 * @property {string|null} scope
 * @property {string} description
 * @property {string|null} issueRef
 */

/**
 * Parses a raw commit line into a Conventional Commit object.
 *
 * @param {string} commitLine In format "hash subject"
 * @returns {ParsedCommit|null}
 */
export function parseConventionalCommit(commitLine) {
  if (!commitLine || typeof commitLine !== 'string') return null;
  const spaceIndex = commitLine.indexOf(' ');
  if (spaceIndex === -1) return null;

  const hash = commitLine.slice(0, spaceIndex).trim();
  const raw = commitLine.slice(spaceIndex + 1).trim();

  // Pattern: type(scope)?: description (#issue)?
  const match = raw.match(/^([a-z]+)(?:\(([^)]+)\))?!?: (.+)$/i);
  if (!match) {
    return {
      hash,
      raw,
      type: 'other',
      scope: null,
      description: raw,
      issueRef: null,
    };
  }

  const type = match[1].toLowerCase();
  const scope = match[2] || null;
  let description = match[3].trim();
  let issueRef = null;

  // Extract issue reference if present at end: (#123) or #123
  const issueMatch = description.match(/(?:\((#\d+)\)|(#\d+))$/);
  if (issueMatch) {
    issueRef = issueMatch[1] || issueMatch[2];
  }

  return {
    hash,
    raw,
    type,
    scope,
    description,
    issueRef,
  };
}

/**
 * Extracts and parses git commits in a range.
 *
 * @param {Object} [options]
 * @param {string} [options.rootDir]
 * @param {string} [options.fromRef]
 * @param {string} [options.toRef]
 * @returns {ParsedCommit[]}
 */
export function getCommits({ rootDir = DEFAULT_ROOT, fromRef = '', toRef = 'HEAD' } = {}) {
  try {
    const range = fromRef ? `${fromRef}..${toRef}` : toRef;
    const gitOutput = execSync(`git log ${range} --oneline --no-merges`, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    return gitOutput
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(parseConventionalCommit)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Groups parsed commits into Keep a Changelog categories.
 *
 * @param {ParsedCommit[]} commits
 * @returns {Record<string, ParsedCommit[]>}
 */
export function groupCommits(commits) {
  const groups = {
    'Added': [],
    'Fixed': [],
    'Changed': [],
    'Documentation': [],
    'Maintenance': [],
  };

  for (const commit of commits) {
    switch (commit.type) {
      case 'feat':
        groups['Added'].push(commit);
        break;
      case 'fix':
        groups['Fixed'].push(commit);
        break;
      case 'refactor':
      case 'perf':
        groups['Changed'].push(commit);
        break;
      case 'docs':
        groups['Documentation'].push(commit);
        break;
      case 'chore':
      case 'ci':
      case 'test':
      case 'build':
        groups['Maintenance'].push(commit);
        break;
      default:
        groups['Maintenance'].push(commit);
        break;
    }
  }

  return groups;
}

/**
 * Generates markdown for a release version section.
 *
 * @param {Object} params
 * @param {string} params.version
 * @param {string} [params.date]
 * @param {ParsedCommit[]} params.commits
 * @returns {string}
 */
export function formatChangelogSection({ version, date = new Date().toISOString().slice(0, 10), commits }) {
  const groups = groupCommits(commits);
  const lines = [`## [${version}] - ${date}`, ''];

  const categoryOrder = [
    { key: 'Added', title: '### Added' },
    { key: 'Fixed', title: '### Fixed' },
    { key: 'Changed', title: '### Changed' },
    { key: 'Documentation', title: '### Documentation' },
    { key: 'Maintenance', title: '### Maintenance' },
  ];

  let hasEntries = false;

  for (const cat of categoryOrder) {
    const items = groups[cat.key];
    if (items && items.length > 0) {
      hasEntries = true;
      lines.push(cat.title);
      for (const item of items) {
        const scopePrefix = item.scope ? `**${item.scope}**: ` : '';
        lines.push(`- ${scopePrefix}${item.description} (\`${item.hash}\`)`);
      }
      lines.push('');
    }
  }

  if (!hasEntries) {
    lines.push('- Initial release with full test and build verification.', '');
  }

  return lines.join('\n');
}

/**
 * Updates CHANGELOG.md with a new version section.
 *
 * @param {Object} params
 * @param {string} [params.changelogPath]
 * @param {string} params.version
 * @param {string} [params.date]
 * @param {ParsedCommit[]} params.commits
 * @returns {string} The full updated content
 */
export function updateChangelog({
  changelogPath = path.join(DEFAULT_ROOT, 'CHANGELOG.md'),
  version,
  date = new Date().toISOString().slice(0, 10),
  commits,
}) {
  const newSection = formatChangelogSection({ version, date, commits });
  const existingContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : CHANGELOG_HEADER;

  // If this version is already documented, replace it; otherwise insert after [Unreleased]
  const versionHeaderRegex = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\].*$`, 'm');
  const unreleasedRegex = /^## \[Unreleased\]/m;

  let updatedContent;
  if (versionHeaderRegex.test(existingContent)) {
    // Replace existing section until the next ## [section] or EOF
    const parts = existingContent.split(versionHeaderRegex);
    const afterHeader = parts[1] || '';
    const nextSectionIndex = afterHeader.search(/\n## \[/);
    const rest = nextSectionIndex !== -1 ? afterHeader.slice(nextSectionIndex) : '';
    updatedContent = `${parts[0].trimEnd()}\n\n${newSection.trimEnd()}\n${rest}`.trim() + '\n';
  } else if (unreleasedRegex.test(existingContent)) {
    updatedContent = existingContent.replace(
      unreleasedRegex,
      `## [Unreleased]\n\n${newSection.trim()}`
    );
  } else {
    updatedContent = `${CHANGELOG_HEADER}\n${newSection.trim()}\n\n${existingContent.replace(/^# Changelog\s*/i, '')}`.trim() + '\n';
  }

  fs.writeFileSync(changelogPath, updatedContent, 'utf8');
  return updatedContent;
}

// CLI entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(DEFAULT_ROOT, 'package.json'), 'utf8'));
  const version = packageJson.version;
  const commits = getCommits({ rootDir: DEFAULT_ROOT });
  updateChangelog({ version, commits });
  console.log(`✓ CHANGELOG.md updated for v${version} (${commits.length} commits parsed)`);
}
