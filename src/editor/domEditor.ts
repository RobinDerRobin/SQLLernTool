import { debounce } from '../util/debounce';
import type { LanguagePlugin } from './languages/LanguagePlugin';
import { dedentLine, insertTab } from './textOps';

interface DomEditorElements {
  textarea: HTMLTextAreaElement;
  overlay: HTMLElement;
  gutter: HTMLElement;
}

interface DomEditorCallbacks {
  onChange?: (value: string) => void;
  onRun?: () => void;
}

export interface DomEditor {
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
  destroy(): void;
}

const SAVE_DEBOUNCE_MS = 600;

function computeLineNumbers(text: string): string {
  const count = text.split('\n').length;
  const lines: string[] = [];
  for (let i = 1; i <= count; i++) lines.push(String(i));
  return lines.join('\n');
}

/**
 * DOM wiring for a code editor: textarea + syntax-highlight overlay `<pre>` +
 * line-number gutter. Every editing rule (enter-indent, bracket auto-close,
 * auto-uppercase, tokenizing for highlight) lives in pure functions on
 * `LanguagePlugin`/`textOps.ts` — this module's only job is translating real
 * DOM events into those pure calls and writing the result back to concrete
 * DOM properties (mirrors the `prepareChallenge`/`SqlEngine` pure-orchestration
 * vs. thin-adapter split used elsewhere in this codebase).
 */
export function createDomEditor(
  elements: DomEditorElements,
  plugin: LanguagePlugin,
  callbacks: DomEditorCallbacks = {},
): DomEditor {
  const { textarea, overlay, gutter } = elements;
  const debouncedOnChange = callbacks.onChange ? debounce(callbacks.onChange, SAVE_DEBOUNCE_MS) : null;

  function autoGrow(): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function syncScroll(): void {
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  }

  function refreshView(): void {
    const value = textarea.value;
    overlay.innerHTML = plugin.highlight(value);
    gutter.textContent = computeLineNumbers(value);
    autoGrow();
    syncScroll();
    debouncedOnChange?.(value);
  }

  function setValueAndCursor(value: string, start: number, end: number = start): void {
    textarea.value = value;
    textarea.selectionStart = start;
    textarea.selectionEnd = end;
  }

  function currentSelectionState() {
    return {
      text: textarea.value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    };
  }

  function onInput(): void {
    const uppercase = plugin.maybeUppercaseLastWord(textarea.value, textarea.selectionStart);
    if (uppercase) {
      setValueAndCursor(uppercase.text, uppercase.cursorPos);
    }
    refreshView();
  }

  function onScroll(): void {
    syncScroll();
  }

  function onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      callbacks.onRun?.();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const insertion = plugin.computeEnterInsertion(value, start);
      const newValue = value.slice(0, start) + insertion + value.slice(end);
      setValueAndCursor(newValue, start + insertion.length);
      refreshView();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const result = e.shiftKey ? dedentLine(currentSelectionState()) : insertTab(currentSelectionState());
      setValueAndCursor(result.text, result.selectionStart, result.selectionEnd);
      refreshView();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const result = plugin.applyAutoClose(e.key, currentSelectionState());
      if (result) {
        e.preventDefault();
        setValueAndCursor(result.text, result.selectionStart, result.selectionEnd);
        refreshView();
      }
    }
  }

  textarea.addEventListener('input', onInput);
  textarea.addEventListener('scroll', onScroll);
  textarea.addEventListener('keydown', onKeydown);

  refreshView();

  return {
    getValue: () => textarea.value,
    setValue: (value: string) => {
      setValueAndCursor(value, value.length);
      refreshView();
    },
    focus: () => textarea.focus(),
    destroy: () => {
      textarea.removeEventListener('input', onInput);
      textarea.removeEventListener('scroll', onScroll);
      textarea.removeEventListener('keydown', onKeydown);
    },
  };
}
