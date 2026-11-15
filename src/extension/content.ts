/**
 * ThreadToLLM - Content Script Entry Point & Runtime Coordinator
 * Manages SPA lifecycle injection and guarded keyboard shortcuts on Modern Reddit (ADR-0003, ADR-0008).
 */

import { SPALifecycleManager } from './spa-lifecycle';
import { notifyIfUnsupportedLayout, NotifyLayoutOptions } from './layout-detector';
import { executeKeyboardCopyTrigger, ShortcutTriggerOptions } from './shortcut-handler';
import { showToast } from './toast';

export type ContentRuntimeOptions = NotifyLayoutOptions & ShortcutTriggerOptions;

export interface ContentRuntime {
  isSupported: boolean;
  lifecycleManager: SPALifecycleManager | null;
  handleMessage: (message: unknown) => Promise<boolean>;
  cleanup: () => void;
}

export function initialize(options?: ContentRuntimeOptions): ContentRuntime {
  const doc = options?.document ?? (typeof document !== 'undefined' ? document : undefined);

  // Check for unsupported layouts (Old Reddit, legacy redesign)
  const isUnsupported = notifyIfUnsupportedLayout({
    hostname: options?.hostname,
    document: doc,
    toastFn: options?.toastFn ?? showToast,
  });

  if (isUnsupported) {
    const handleUnsupportedMessage = async (message: unknown): Promise<boolean> => {
      if (message && typeof message === 'object' && (message as { type?: string }).type === 'TRIGGER_COPY_THREAD') {
        notifyIfUnsupportedLayout({
          hostname: options?.hostname,
          document: doc,
          toastFn: options?.toastFn ?? showToast,
        });
        return false;
      }
      return false;
    };

    let chromeListener: ((message: unknown, sender: unknown, sendResponse: (resp: unknown) => void) => boolean) | null = null;
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chromeListener = (message: unknown, _sender: unknown, sendResponse: (resp: unknown) => void) => {
        void handleUnsupportedMessage(message).then((result) => {
          sendResponse({ handled: result });
        });
        return true;
      };
      chrome.runtime.onMessage.addListener(chromeListener);
    }

    return {
      isSupported: false,
      lifecycleManager: null,
      handleMessage: handleUnsupportedMessage,
      cleanup: () => {
        if (chromeListener && typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
          chrome.runtime.onMessage.removeListener(chromeListener);
        }
      },
    };
  }

  // Start SPA lifecycle manager for dynamic post injection
  const lifecycleManager = new SPALifecycleManager({
    root: doc?.body ?? doc,
  });
  lifecycleManager.start();

  const handleMessage = async (message: unknown): Promise<boolean> => {
    if (message && typeof message === 'object' && (message as { type?: string }).type === 'TRIGGER_COPY_THREAD') {
      return executeKeyboardCopyTrigger({
        document: doc,
        clipboard: options?.clipboard,
        toastFn: options?.toastFn,
        adapter: options?.adapter,
        filterPipeline: options?.filterPipeline,
        serializer: options?.serializer,
      });
    }
    return false;
  };

  // Wire chrome.runtime.onMessage listener if in browser extension runtime
  const chromeListener = (message: unknown, _sender: unknown, sendResponse: (resp: unknown) => void) => {
    void handleMessage(message).then((result) => {
      sendResponse({ handled: result });
    });
    return true; // Keep message channel open for async response
  };

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(chromeListener);
  }

  const cleanup = () => {
    lifecycleManager.stop();
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(chromeListener);
    }
  };

  return {
    isSupported: true,
    lifecycleManager,
    handleMessage,
    cleanup,
  };
}

// Auto-execute strictly within Chrome Extension runtime context
if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && chrome.runtime?.id) {
  initialize();
}
