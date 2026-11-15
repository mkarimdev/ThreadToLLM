/**
 * ThreadToLLM - Extension Layer
 * Vite Manifest V3 entry points and lifecycle management (ADR-0008, ADR-0009).
 */

export const EXTENSION_LAYER = 'extension' as const;
export * from './content';
export * from './toast';
export * from './focus-guard';
export * from './layout-detector';
export * from './spa-lifecycle';
export * from './shortcut-handler';
export * from './background';
