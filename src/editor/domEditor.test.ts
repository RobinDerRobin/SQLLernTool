import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomEditor } from './domEditor';
import { sqlLanguagePlugin } from './languages/sql/sqlLanguagePlugin';

function buildElements() {
  const textarea = document.createElement('textarea');
  const overlay = document.createElement('pre');
  const gutter = document.createElement('div');
  document.body.append(textarea, overlay, gutter);
  return { textarea, overlay, gutter };
}

function setCursor(textarea: HTMLTextAreaElement, pos: number) {
  textarea.selectionStart = pos;
  textarea.selectionEnd = pos;
}

describe('createDomEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('setValue()/getValue() round-trip and render the initial highlight + line numbers', () => {
    const { textarea, overlay, gutter } = buildElements();
    const editor = createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});

    editor.setValue('SELECT 1;\nSELECT 2;');

    expect(editor.getValue()).toBe('SELECT 1;\nSELECT 2;');
    expect(overlay.innerHTML).toBe(sqlLanguagePlugin.highlight('SELECT 1;\nSELECT 2;'));
    expect(gutter.textContent).toBe('1\n2');
  });

  it('updates the overlay highlight when the user types (input event)', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});

    textarea.value = 'SELECT';
    setCursor(textarea, 6);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    expect(overlay.innerHTML).toBe(sqlLanguagePlugin.highlight('SELECT'));
  });

  it('debounces onChange 600ms after the last input event', () => {
    const { textarea, overlay, gutter } = buildElements();
    const onChange = vi.fn();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, { onChange });

    textarea.value = 'SELECT 1;';
    setCursor(textarea, 9);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(599);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledWith('SELECT 1;');
  });

  it('auto-uppercases a lowercase keyword on a boundary character during input', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});

    textarea.value = 'select ';
    setCursor(textarea, 7);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    expect(textarea.value).toBe('SELECT ');
  });

  it('Enter inserts the pure computeEnterInsertion() result and prevents default', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});
    textarea.value = '  SELECT 1';
    setCursor(textarea, textarea.value.length);

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(textarea.value).toBe('  SELECT 1\n  ');
    expect(textarea.selectionStart).toBe(textarea.value.length);
  });

  it('Ctrl+Enter calls onRun instead of inserting a newline', () => {
    const { textarea, overlay, gutter } = buildElements();
    const onRun = vi.fn();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, { onRun });
    textarea.value = 'SELECT 1';
    setCursor(textarea, textarea.value.length);

    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe('SELECT 1');
    expect(event.defaultPrevented).toBe(true);
  });

  it('Tab inserts a tab character at the cursor', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});
    textarea.value = 'ab';
    setCursor(textarea, 1);

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(textarea.value).toBe('a\tb');
    expect(event.defaultPrevented).toBe(true);
  });

  it('Shift+Tab dedents the current line', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});
    textarea.value = '\tSELECT 1';
    setCursor(textarea, textarea.value.length);

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(textarea.value).toBe('SELECT 1');
  });

  it('typing an opening bracket auto-closes it via the language plugin', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});
    textarea.value = '';
    setCursor(textarea, 0);

    const event = new KeyboardEvent('keydown', { key: '(', bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(textarea.value).toBe('()');
    expect(textarea.selectionStart).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not preventDefault for a character the plugin has no special handling for', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});

    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('syncs overlay and gutter scrollTop to the textarea on scroll', () => {
    const { textarea, overlay, gutter } = buildElements();
    createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});

    Object.defineProperty(textarea, 'scrollTop', { value: 42, writable: true });
    textarea.dispatchEvent(new Event('scroll', { bubbles: true }));

    expect(overlay.scrollTop).toBe(42);
    expect(gutter.scrollTop).toBe(42);
  });

  it('destroy() stops the editor from reacting to further events', () => {
    const { textarea, overlay, gutter } = buildElements();
    const onRun = vi.fn();
    const editor = createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, { onRun });

    editor.destroy();
    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(onRun).not.toHaveBeenCalled();
  });

  it('focus() focuses the textarea', () => {
    const { textarea, overlay, gutter } = buildElements();
    const editor = createDomEditor({ textarea, overlay, gutter }, sqlLanguagePlugin, {});
    editor.focus();
    expect(document.activeElement).toBe(textarea);
  });
});
