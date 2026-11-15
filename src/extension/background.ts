/**
 * ThreadToLLM - Background Service Worker Router
 * Routes chrome.commands keyboard shortcuts to active Reddit tab content scripts (ADR-0008).
 */

export async function handleCommand(
  command: string,
  chromeInstance?: typeof chrome
): Promise<boolean> {
  const browser =
    chromeInstance ??
    (typeof chrome !== 'undefined' ? chrome : undefined);

  if (!browser || !browser.tabs) {
    return false;
  }

  if (command === 'copy-thread') {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await browser.tabs.sendMessage(tab.id, { type: 'TRIGGER_COPY_THREAD' });
        return true;
      }
    } catch {
      // Content script may not be loaded or receiving tab cannot be reached
      return false;
    }
  }

  return false;
}

// Register listener in extension runtime context
if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.commands?.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    void handleCommand(command);
  });
}
