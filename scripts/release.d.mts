export interface CliArgs {
  releaseType: 'patch' | 'minor' | 'major' | null;
  isDryRun: boolean;
  isPublish: boolean;
  isPackageOnly: boolean;
}

export const repoRoot: string;

export function runGit(cmd: string, options?: Record<string, unknown>): string;
export function parseCliArgs(argv?: string[]): CliArgs;
export function assertCleanWorkingTree(): void;
export function assertTagReachability(): void;
export function runVerificationChecks(): void;
export function getCurrentVersion(): string;
export function computeNextVersion(currentVersion: string, releaseType: string): string;
export function getCommitsSinceLastTag(): string[];
export function generateChangelogSection(nextVersion: string, commits: string[]): string;
export function updateManifests(nextVersion: string): string[];
export function updateChangelog(changelogSection: string): string;
export function validateDeclaredIcons(manifestPath: string, publicDir: string): Array<{ relativePath: string; fullPath: string }>;
export function createZipArchive(files: Array<{ name: string; content: Buffer | string }>): Buffer;
export function buildAndPackageZip(
  version: string,
  options?: { rootDir?: string; silent?: boolean; skipBuild?: boolean }
): {
  version: string;
  zipPath: string;
  rootZipPath: string;
  fileCount: number;
  zipSize: number;
};
export function main(): void;
