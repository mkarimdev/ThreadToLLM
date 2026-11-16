import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Governance & Community Health Standards (#15)', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('License & Package Metadata', () => {
    const licensePath = path.join(rootDir, 'LICENSE');
    const packagePath = path.join(rootDir, 'package.json');

    it('LICENSE file exists at root with MIT terms and copyright holder', () => {
      expect(fs.existsSync(licensePath)).toBe(true);
      const content = fs.readFileSync(licensePath, 'utf-8');
      expect(content).toContain('MIT License');
      expect(content).toContain('2026');
      expect(content).toContain('mkarimdev (Karim)');
    });

    it('package.json declares MIT license', () => {
      expect(fs.existsSync(packagePath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      expect(pkg.license).toBe('MIT');
    });
  });

  describe('GitHub Issue Templates', () => {
    const templatesDir = path.join(rootDir, '.github', 'ISSUE_TEMPLATE');

    it('bug_report.yml exists and contains structured fields for reproduction', () => {
      const bugReportPath = path.join(templatesDir, 'bug_report.yml');
      expect(fs.existsSync(bugReportPath)).toBe(true);
      const content = fs.readFileSync(bugReportPath, 'utf-8');
      expect(content).toContain('name: Bug Report');
      expect(content).toContain('labels: ["needs-triage", "bug"]');
      expect(content).toContain('thread_url');
      expect(content).toContain('browser_version');
      expect(content).toContain('expected_output');
      expect(content).toContain('actual_output');
      expect(content).toContain('console_errors');
    });

    it('adapter_proposal.yml exists and prompts for Host Platform details', () => {
      const proposalPath = path.join(templatesDir, 'adapter_proposal.yml');
      expect(fs.existsSync(proposalPath)).toBe(true);
      const content = fs.readFileSync(proposalPath, 'utf-8');
      expect(content).toContain('name: Platform Adapter Proposal');
      expect(content).toContain('labels: ["needs-triage", "enhancement"]');
      expect(content).toContain('platform_name');
      expect(content).toContain('example_urls');
      expect(content).toContain('dom_complexity');
      expect(content).toContain('ui_injection_target');
    });

    it('config.yml disables blank issues and links to community resources', () => {
      const configPath = path.join(templatesDir, 'config.yml');
      expect(fs.existsSync(configPath)).toBe(true);
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('blank_issues_enabled: false');
      expect(content).toContain('contact_links:');
    });
  });

  describe('Pull Request Template', () => {
    const prTemplatePath = path.join(rootDir, '.github', 'pull_request_template.md');

    it('pull_request_template.md exists and enforces mandatory verification checklist', () => {
      expect(fs.existsSync(prTemplatePath)).toBe(true);
      const content = fs.readFileSync(prTemplatePath, 'utf-8');
      expect(content).toContain('Conventional Commits');
      expect(content).toContain('npm run check');
      expect(content).toContain('Automated Test Coverage');
      expect(content).toContain('Three-Layer Architectural Seams');
      expect(content).toContain('Domain Language Compliance');
    });
  });

  describe('Contributing Guide (CONTRIBUTING.md)', () => {
    const contributingPath = path.join(rootDir, 'CONTRIBUTING.md');

    it('CONTRIBUTING.md exists and covers setup, git workflow, and adapter guide', () => {
      expect(fs.existsSync(contributingPath)).toBe(true);
      const content = fs.readFileSync(contributingPath, 'utf-8');

      // Development Setup
      expect(content).toContain('npm run dev');
      expect(content).toContain('npm run build');
      expect(content).toContain('npm run check');
      expect(content).toContain('chrome://extensions');

      // Trunk-based workflow
      expect(content).toContain('Trunk-Based Development');
      expect(content).toContain('master');

      // Conventional Commits
      expect(content).toContain('Conventional Commits');
      expect(content).toContain('<type>(<scope>): <short imperative description> (#<issue>)');

      // Architectural guide & Three layers
      expect(content).toContain('Three-Layer Modular Architecture');
      expect(content).toContain('PlatformAdapter');
      expect(content).toContain('PlatformUI');
      expect(content).toContain('ThreadDocument');
      expect(content).toContain('GLOSSARY.md');
    });
  });
});
