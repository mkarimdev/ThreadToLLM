/**
 * ThreadToLLM - Smoke-test Content Script
 * Executes on Reddit to verify extension loading and execution.
 */

export function initialize(): void {
  console.log('[ThreadToLLM] Content script initialized on reddit.com');
}

// Execute on injection when running in browser context
if (typeof window !== 'undefined') {
  initialize();
}
