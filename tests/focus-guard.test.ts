// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { isEditableElement, getDeepActiveElement } from '../src/extension/focus-guard';

describe('Focus Guard Seam (isEditableElement)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns true for HTMLInputElement', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    expect(isEditableElement(input)).toBe(true);
  });

  it('returns true for HTMLTextAreaElement', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    expect(isEditableElement(textarea)).toBe(true);
  });

  it('returns true for element with contenteditable="true" or contenteditable=""', () => {
    const editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', 'true');
    document.body.appendChild(editableDiv);

    expect(isEditableElement(editableDiv)).toBe(true);

    const editableEmpty = document.createElement('div');
    editableEmpty.setAttribute('contenteditable', '');
    document.body.appendChild(editableEmpty);

    expect(isEditableElement(editableEmpty)).toBe(true);
  });

  it('returns true for child nested inside a contenteditable container', () => {
    const container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    const childSpan = document.createElement('span');
    childSpan.textContent = 'User typing here';
    container.appendChild(childSpan);
    document.body.appendChild(container);

    expect(isEditableElement(childSpan)).toBe(true);
  });

  it('returns false for regular elements (div, button, body, null)', () => {
    const regularDiv = document.createElement('div');
    const button = document.createElement('button');
    document.body.appendChild(regularDiv);
    document.body.appendChild(button);

    expect(isEditableElement(regularDiv)).toBe(false);
    expect(isEditableElement(button)).toBe(false);
    expect(isEditableElement(document.body)).toBe(false);
    expect(isEditableElement(null)).toBe(false);
  });

  it('returns false for element with contenteditable="false"', () => {
    const nonEditable = document.createElement('div');
    nonEditable.setAttribute('contenteditable', 'false');
    document.body.appendChild(nonEditable);

    expect(isEditableElement(nonEditable)).toBe(false);
  });

  it('resolves active element across shadow DOM boundaries', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const innerInput = document.createElement('input');
    shadow.appendChild(innerInput);

    innerInput.focus();
    // In happy-dom, verify getDeepActiveElement resolves innerInput
    const active = getDeepActiveElement(document);
    expect(isEditableElement(active)).toBe(true);
  });
});
