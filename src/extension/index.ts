/**
 * ThreadToLLM - Extension Layer
 * Vite Manifest V3 entry points and lifecycle management (ADR-0008, ADR-0009).
 */

export const EXTENSION_LAYER = 'extension' as const;
export { initialize } from './content';
