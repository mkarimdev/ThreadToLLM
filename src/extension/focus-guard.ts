/**
 * ThreadToLLM - Focus Guard Utility
 * Identifies active text inputs or contenteditable elements to prevent shortcut hijacking (ADR-0008).
 */

/**
 * Resolves the deeply nested activeElement through shadow DOM trees.
 */
export function getDeepActiveElement(doc: Document = document): Element | null {
  let active: Element | null = doc.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/**
 * Checks whether an element is an interactive text input, textarea, or contenteditable region.
 */
export function isEditableElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  const tagName = element.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
    return true;
  }

  if ('isContentEditable' in element && (element as HTMLElement).isContentEditable) {
    return true;
  }

  const editableAttr = element.getAttribute?.('contenteditable');
  if (editableAttr === '' || editableAttr === 'true') {
    return true;
  }

  const closestEditable = element.closest?.('[contenteditable="true"], [contenteditable=""]');
  if (closestEditable) {
    return true;
  }

  return false;
}
