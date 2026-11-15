/**
 * ThreadToLLM - Adapters Layer
 * DOM querying and native UI injection contracts and implementations (ADR-0006, ADR-0009).
 */

export const ADAPTERS_LAYER = 'adapters' as const;
export * from './adapter.interface';
export * from './reddit';
