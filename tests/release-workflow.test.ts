import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface WorkflowStep {
  name?: string;
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
  [key: string]: unknown;
}

interface WorkflowJob {
  'runs-on'?: string;
  permissions?: Record<string, string>;
  steps?: WorkflowStep[];
  [key: string]: unknown;
}

interface WorkflowConfig {
  name?: string;
  on?: {
    push?: {
      tags?: string[];
      branches?: string[];
    };
    [key: string]: unknown;
  };
  permissions?: Record<string, string>;
  jobs?: Record<string, WorkflowJob>;
  [key: string]: unknown;
}

interface ParsedLine {
  indent: number;
  text: string;
  lineNum: number;
}

/**
 * Lightweight pure TypeScript YAML parser designed for GitHub Actions workflow definitions.
 * Validates syntax (disallows tab indents, unclosed quotes, malformed pairs) and constructs typed object.
 */
export function parseWorkflowYaml(content: string): WorkflowConfig {
  const rawLines = content.split(/\r?\n/);
  const parsedLines: ParsedLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    if (/^\t+/.test(raw) || /^[ ]*\t+[ ]*/.test(raw)) {
      throw new Error(`YAML syntax error: Tab indentation detected at line ${i + 1}`);
    }

    // Strip comments outside quotes
    let inSingle = false;
    let inDouble = false;
    let commentIdx = -1;
    for (let c = 0; c < raw.length; c++) {
      const char = raw[c];
      if (char === "'" && !inDouble) inSingle = !inSingle;
      else if (char === '"' && !inSingle) inDouble = !inDouble;
      else if (char === '#' && !inSingle && !inDouble) {
        commentIdx = c;
        break;
      }
    }

    if (inSingle || inDouble) {
      throw new Error(`YAML syntax error: Unclosed quote at line ${i + 1}`);
    }

    const clean = (commentIdx >= 0 ? raw.slice(0, commentIdx) : raw).trimEnd();
    if (clean.trim().length === 0) continue;

    const indent = clean.search(/\S/);
    parsedLines.push({
      indent,
      text: clean.trim(),
      lineNum: i + 1,
    });
  }

  if (parsedLines.length === 0) {
    throw new Error('YAML document is empty');
  }

  function parseScalar(val: string): unknown {
    const trimmed = val.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null' || trimmed === '~') return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map((s) => parseScalar(s.trim()));
    }
    return trimmed;
  }

  let index = 0;

  function parseBlock(_currentIndent: number): unknown {
    if (index >= parsedLines.length) return null;

    const firstToken = parsedLines[index];
    const isList = firstToken.text.startsWith('- ') || firstToken.text === '-';

    if (isList) {
      const list: unknown[] = [];
      const listIndent = firstToken.indent;

      while (
        index < parsedLines.length &&
        parsedLines[index].indent === listIndent &&
        (parsedLines[index].text.startsWith('- ') || parsedLines[index].text === '-')
      ) {
        const itemLine = parsedLines[index];
        const contentAfterDash = itemLine.text === '-' ? '' : itemLine.text.slice(2).trim();
        index++;

        if (contentAfterDash.length === 0) {
          if (index < parsedLines.length && parsedLines[index].indent > listIndent) {
            list.push(parseBlock(parsedLines[index].indent));
          } else {
            list.push(null);
          }
        } else if (contentAfterDash.includes(':')) {
          const colonIdx = contentAfterDash.indexOf(':');
          const key = contentAfterDash.slice(0, colonIdx).trim();
          const valPart = contentAfterDash.slice(colonIdx + 1).trim();

          const itemObj: Record<string, unknown> = {};
          if (valPart.length > 0) {
            itemObj[key] = parseScalar(valPart);
          } else {
            if (index < parsedLines.length && parsedLines[index].indent > listIndent) {
              itemObj[key] = parseBlock(parsedLines[index].indent);
            } else {
              itemObj[key] = null;
            }
          }

          while (
            index < parsedLines.length &&
            parsedLines[index].indent > listIndent &&
            !parsedLines[index].text.startsWith('- ')
          ) {
            const nextToken = parsedLines[index];
            const nextColon = nextToken.text.indexOf(':');
            if (nextColon === -1) {
              throw new Error(`YAML syntax error at line ${nextToken.lineNum}: Expected key-value pair, got "${nextToken.text}"`);
            }
            const nextKey = nextToken.text.slice(0, nextColon).trim();
            const nextVal = nextToken.text.slice(nextColon + 1).trim();
            index++;

            if (nextVal.length > 0) {
              itemObj[nextKey] = parseScalar(nextVal);
            } else {
              if (index < parsedLines.length && parsedLines[index].indent > nextToken.indent) {
                itemObj[nextKey] = parseBlock(parsedLines[index].indent);
              } else {
                itemObj[nextKey] = null;
              }
            }
          }
          list.push(itemObj);
        } else {
          list.push(parseScalar(contentAfterDash));
        }
      }
      return list;
    } else {
      const map: Record<string, unknown> = {};
      const mapIndent = firstToken.indent;

      while (index < parsedLines.length && parsedLines[index].indent === mapIndent) {
        const token = parsedLines[index];
        if (token.text.startsWith('- ')) {
          break;
        }
        const colonIdx = token.text.indexOf(':');
        if (colonIdx === -1) {
          throw new Error(`YAML syntax error at line ${token.lineNum}: Expected key-value pair, got "${token.text}"`);
        }
        const key = token.text.slice(0, colonIdx).trim();
        const valPart = token.text.slice(colonIdx + 1).trim();
        index++;

        if (valPart.length > 0) {
          map[key] = parseScalar(valPart);
        } else {
          if (index < parsedLines.length && parsedLines[index].indent > mapIndent) {
            map[key] = parseBlock(parsedLines[index].indent);
          } else {
            map[key] = null;
          }
        }
      }
      return map;
    }
  }

  return parseBlock(0) as WorkflowConfig;
}

describe('GitHub Actions Automated Release Pipeline (#17)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'release.yml');

  it('verifies that .github/workflows/release.yml exists on disk', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  describe('Workflow Configuration & Structure', () => {
    let workflowContent: string;
    let workflow: WorkflowConfig;

    beforeAll(() => {
      if (fs.existsSync(workflowPath)) {
        workflowContent = fs.readFileSync(workflowPath, 'utf-8');
        workflow = parseWorkflowYaml(workflowContent);
      }
    });

    it('is valid YAML without tab indentation or unclosed quotes', () => {
      expect(workflowContent).toBeDefined();
      expect(workflowContent.length).toBeGreaterThan(0);
      expect(() => parseWorkflowYaml(workflowContent)).not.toThrow();
    });

    it('triggers on push of version tags matching "v*"', () => {
      expect(workflow.on).toBeDefined();
      expect(workflow.on?.push).toBeDefined();
      expect(workflow.on?.push?.tags).toBeDefined();
      expect(workflow.on?.push?.tags).toContain('v*');
    });

    it('configures permissions with contents: write for GitHub Release asset publishing', () => {
      // Permission can be defined at top-level or at job-level
      const hasTopLevelPermission = workflow.permissions?.contents === 'write';
      const jobs = workflow.jobs || {};
      const jobKeys = Object.keys(jobs);
      const hasJobLevelPermission = jobKeys.some(
        (key) => jobs[key]?.permissions?.contents === 'write'
      );

      expect(hasTopLevelPermission || hasJobLevelPermission).toBe(true);
    });

    it('defines a release job that runs on ubuntu-latest', () => {
      const jobs = workflow.jobs || {};
      const jobKeys = Object.keys(jobs);
      expect(jobKeys.length).toBeGreaterThan(0);

      const releaseJob = jobs.release || jobs[jobKeys[0]];
      expect(releaseJob).toBeDefined();
      expect(releaseJob['runs-on']).toBe('ubuntu-latest');
    });

    it('includes all required pipeline steps in correct execution order', () => {
      const jobs = workflow.jobs || {};
      const releaseJob = jobs.release || jobs[Object.keys(jobs)[0]];
      const steps = releaseJob.steps || [];

      // Step 1: actions/checkout@v4
      const checkoutStep = steps.find((s) => s.uses?.startsWith('actions/checkout@v4'));
      expect(checkoutStep).toBeDefined();

      // Step 2: actions/setup-node@v4 with node-version: 24 and cache: 'npm'
      const setupNodeStep = steps.find((s) => s.uses?.startsWith('actions/setup-node@v4'));
      expect(setupNodeStep).toBeDefined();
      expect(setupNodeStep?.with).toBeDefined();
      expect(String(setupNodeStep?.with?.['node-version'])).toBe('24');
      expect(setupNodeStep?.with?.cache).toBe('npm');

      // Step 3: npm ci
      const npmCiStep = steps.find((s) => s.run?.trim() === 'npm ci');
      expect(npmCiStep).toBeDefined();

      // Step 4: npm run check (verifies lint, typecheck, test, and build)
      const npmCheckStep = steps.find((s) => s.run?.includes('npm run check'));
      expect(npmCheckStep).toBeDefined();

      // Step 5: npm run package
      const npmPackageStep = steps.find((s) => s.run?.includes('npm run package'));
      expect(npmPackageStep).toBeDefined();

      // Step 6: softprops/action-gh-release@v2 with generate_release_notes and release zip
      const releaseStep = steps.find((s) => s.uses?.startsWith('softprops/action-gh-release@v2'));
      expect(releaseStep).toBeDefined();
      expect(releaseStep?.with?.generate_release_notes).toBe(true);

      const files = releaseStep?.with?.files;
      const filePattern = typeof files === 'string' ? files : Array.isArray(files) ? files.join('\n') : '';
      const attachesZip =
        filePattern.includes('thread-to-llm-v*.zip') ||
        filePattern.includes('dist-zip/*.zip') ||
        filePattern.includes('dist-zip/thread-to-llm-v*.zip');
      expect(attachesZip).toBe(true);
    });

    it('enforces that pipeline steps are ordered in correct dependency sequence', () => {
      const jobs = workflow.jobs || {};
      const releaseJob = jobs.release || jobs[Object.keys(jobs)[0]];
      const steps = releaseJob.steps || [];

      const stepDescriptions = steps.map((s) => s.uses || s.run || '');

      const checkoutIdx = stepDescriptions.findIndex((d) => d.startsWith('actions/checkout'));
      const setupNodeIdx = stepDescriptions.findIndex((d) => d.startsWith('actions/setup-node'));
      const npmCiIdx = stepDescriptions.findIndex((d) => d.includes('npm ci'));
      const npmCheckIdx = stepDescriptions.findIndex((d) => d.includes('npm run check'));
      const npmPackageIdx = stepDescriptions.findIndex((d) => d.includes('npm run package'));
      const ghReleaseIdx = stepDescriptions.findIndex((d) => d.startsWith('softprops/action-gh-release'));

      expect(checkoutIdx).toBeGreaterThanOrEqual(0);
      expect(setupNodeIdx).toBeGreaterThan(checkoutIdx);
      expect(npmCiIdx).toBeGreaterThan(setupNodeIdx);
      expect(npmCheckIdx).toBeGreaterThan(npmCiIdx);
      expect(npmPackageIdx).toBeGreaterThan(npmCheckIdx);
      expect(ghReleaseIdx).toBeGreaterThan(npmPackageIdx);
    });
  });

  describe('YAML Parser Syntax Diagnostics', () => {
    it('detects and rejects tab indentation', () => {
      const invalidYaml = 'name: Test\n\trun: npm test';
      expect(() => parseWorkflowYaml(invalidYaml)).toThrow(/Tab indentation detected/);
    });

    it('detects and rejects unclosed quotes', () => {
      const invalidYaml = 'name: "Unclosed\nrun: npm test';
      expect(() => parseWorkflowYaml(invalidYaml)).toThrow(/Unclosed quote/);
    });

    it('rejects empty or whitespace-only documents', () => {
      expect(() => parseWorkflowYaml('')).toThrow(/YAML document is empty/);
      expect(() => parseWorkflowYaml('   \n\n  # comment only\n')).toThrow(/YAML document is empty/);
    });

    it('parses flow sequence format correctly', () => {
      const flowYaml = "on:\n  push:\n    tags: ['v*']";
      const parsed = parseWorkflowYaml(flowYaml);
      expect(parsed.on?.push?.tags).toEqual(['v*']);
    });
  });
});
