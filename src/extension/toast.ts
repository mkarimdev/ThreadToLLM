/**
 * ThreadToLLM - Toast Notification Utility
 * Renders subtle, accessible feedback toasts in the host page (ADR-0003, ADR-0008).
 */

export interface ToastOptions {
  durationMs?: number;
  parent?: HTMLElement;
  type?: 'info' | 'success' | 'warning' | 'error';
}

type ToastType = NonNullable<ToastOptions['type']>;

interface ToastPresentation {
  role: 'status' | 'alert';
  ariaLive: 'polite' | 'assertive';
  backgroundColor: string;
}

const TOAST_PRESENTATION: Record<ToastType, ToastPresentation> = {
  info: { role: 'status', ariaLive: 'polite', backgroundColor: '#1e293b' },
  success: { role: 'status', ariaLive: 'polite', backgroundColor: '#1e293b' },
  warning: { role: 'alert', ariaLive: 'assertive', backgroundColor: '#b45309' },
  error: { role: 'alert', ariaLive: 'assertive', backgroundColor: '#b91c1c' },
};

const DEFAULT_DURATION_MS = 3000;
const TOAST_CLASS = 'thread-to-llm-toast';

export function showToast(message: string, options?: ToastOptions): HTMLElement {
  const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;
  const parent = options?.parent ?? document.body;
  const type = options?.type ?? 'info';
  const presentation = TOAST_PRESENTATION[type];

  const toast = document.createElement('div');
  toast.className = TOAST_CLASS;
  toast.setAttribute('role', presentation.role);
  toast.setAttribute('aria-live', presentation.ariaLive);

  // Modern styling for subtle overlay
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    padding: '10px 16px',
    borderRadius: '8px',
    backgroundColor: presentation.backgroundColor,
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    opacity: '1',
    transform: 'translateY(0)',
  });

  toast.textContent = message;
  parent.appendChild(toast);

  if (durationMs > 0) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, durationMs);
  }

  return toast;
}
