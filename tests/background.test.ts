import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCommand } from '../src/extension/background';

describe('Background Service Worker Seam (handleCommand)', () => {
  let mockChrome: {
    tabs: {
      query: ReturnType<typeof vi.fn>;
      sendMessage: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockChrome = {
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
      },
    };
  });

  it('forwards copy-thread command to active tab', async () => {
    mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);
    mockChrome.tabs.sendMessage.mockResolvedValue(undefined);

    const result = await handleCommand('copy-thread', mockChrome as unknown as typeof chrome);

    expect(result).toBe(true);
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, { type: 'TRIGGER_COPY_THREAD' });
  });

  it('ignores unhandled commands', async () => {
    const result = await handleCommand('other-command', mockChrome as unknown as typeof chrome);

    expect(result).toBe(false);
    expect(mockChrome.tabs.query).not.toHaveBeenCalled();
    expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('handles scenario when no active tab has an ID', async () => {
    mockChrome.tabs.query.mockResolvedValue([]);

    const result = await handleCommand('copy-thread', mockChrome as unknown as typeof chrome);

    expect(result).toBe(false);
    expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('handles tab sendMessage rejection gracefully', async () => {
    mockChrome.tabs.query.mockResolvedValue([{ id: 456 }]);
    mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Receiving end does not exist'));

    const result = await handleCommand('copy-thread', mockChrome as unknown as typeof chrome);

    expect(result).toBe(false);
  });
});
