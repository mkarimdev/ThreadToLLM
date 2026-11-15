import { describe, it, expect } from 'vitest';
import * as core from '../src/core';
import * as adapters from '../src/adapters';
import * as extension from '../src/extension';

describe('Three-Layer Architecture Seams', () => {
  it('core layer is defined and exported', () => {
    expect(core).toBeDefined();
  });

  it('adapters layer is defined and exported', () => {
    expect(adapters).toBeDefined();
  });

  it('extension layer is defined and exports content initialization', () => {
    expect(extension).toBeDefined();
    expect(typeof extension.initialize).toBe('function');
  });
});
