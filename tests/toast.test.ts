// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../src/extension/toast';

describe('Toast Notification Seam (showToast)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders a toast element into document.body with message text and accessible attributes', () => {
    const toast = showToast('Copied 5 comments to clipboard!');

    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Copied 5 comments to clipboard!');
    expect(document.body.contains(toast)).toBe(true);
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.classList.contains('thread-to-llm-toast')).toBe(true);
  });

  it('removes toast element from DOM after specified duration', async () => {
    const toast = showToast('Temporary notification', { durationMs: 2000 });

    expect(document.body.contains(toast)).toBe(true);

    // Fast-forward past duration
    vi.advanceTimersByTime(2000);

    expect(document.body.contains(toast)).toBe(false);
  });

  it('sets role="alert" when type is warning', () => {
    const toast = showToast('Warning message', { type: 'warning' });

    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.style.backgroundColor).toBe('#b45309');
  });

  it('sets role="alert" and error styling when type is error', () => {
    const toast = showToast('Failed to copy thread to clipboard', { type: 'error' });

    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.getAttribute('aria-live')).toBe('assertive');
    expect(toast.style.backgroundColor).toBe('#b91c1c');
  });
});
