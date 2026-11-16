/// <reference types="node" />

export interface PackageReleaseOptions {
  rootDir?: string;
  distDir?: string;
  outDir?: string;
  skipBuild?: boolean;
  silent?: boolean;
}

export interface PackageReleaseResult {
  version: string;
  zipPath: string;
  rootZipPath: string;
  fileCount: number;
  zipSize: number;
  files: string[];
}

export interface ZipEntry {
  name: string;
  method: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export interface ValidatedIcon {
  key: string;
  relativePath: string;
  fullPath: string;
  width: number;
  height: number;
  bytes: number;
}

export interface FileToZip {
  name: string;
  content: Buffer | string;
  date?: Date;
}

export function validateVersionParity(packageJsonPath?: string, manifestPath?: string): string;
export function validateDeclaredIcons(manifestPath?: string, publicDir?: string): ValidatedIcon[];
export function createZipArchive(files: FileToZip[]): Buffer;
export function parseZipEntries(zipBuffer: Buffer): ZipEntry[];
export function extractZipFile(zipBuffer: Buffer, targetName: string): Buffer;
export function packageRelease(options?: PackageReleaseOptions): PackageReleaseResult;
