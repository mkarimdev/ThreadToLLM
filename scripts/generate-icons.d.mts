/// <reference types="node" />

export interface GeneratedIconResult {
  size: number;
  path: string;
  bytes: number;
}

export interface PngDimensions {
  width: number;
  height: number;
}

export function encodePng(width: number, height: number, rgbaBuffer: Buffer): Buffer;
export function parsePngDimensions(buffer: Buffer): PngDimensions;
export function generateIcon(size: number): Buffer;
export function generateAllIcons(outputDir?: string): GeneratedIconResult[];
