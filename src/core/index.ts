/**
 * ThreadToLLM - Core Layer
 * Pure TypeScript models, filtering, and serialization with zero DOM or browser API dependencies (ADR-0009).
 */

export * from './types';
export * from './serializer';
export const CORE_LAYER = 'core' as const;

