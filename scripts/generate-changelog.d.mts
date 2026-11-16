export interface ParsedCommit {
  hash: string;
  raw: string;
  type: string;
  scope: string | null;
  description: string;
  issueRef: string | null;
}

export function parseConventionalCommit(commitLine: string): ParsedCommit | null;

export function getCommits(options?: {
  rootDir?: string;
  fromRef?: string;
  toRef?: string;
}): ParsedCommit[];

export function groupCommits(commits: ParsedCommit[]): Record<string, ParsedCommit[]>;

export function formatChangelogSection(params: {
  version: string;
  date?: string;
  commits: ParsedCommit[];
}): string;

export function updateChangelog(params: {
  changelogPath?: string;
  version: string;
  date?: string;
  commits: ParsedCommit[];
}): string;
