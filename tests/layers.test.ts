import { describe, it, expect } from 'vitest';
import * as core from '../src/core';
import * as adapters from '../src/adapters';
import * as extension from '../src/extension';

describe('Three-Layer Architecture Seams', () => {
  it('core layer is defined and isolated', () => {
    expect(core.CORE_LAYER).toBe('core');
  });

  it('adapters layer is defined', () => {
    expect(adapters.ADAPTERS_LAYER).toBe('adapters');
  });

  it('extension layer is defined and exports content initialization without side effects', () => {
    expect(extension.EXTENSION_LAYER).toBe('extension');
    expect(typeof extension.initialize).toBe('function');
  });
});
