// Rendered with the same CSS classes the SQL track's tokenizer uses
// (tok-keyword / tok-keywordAlt / tok-function / ...), so no new theme work
// is needed for a second language plugin.
export const PYTHON_KEYWORDS = new Set([
  'if', 'elif', 'else', 'for', 'while', 'def', 'return', 'break', 'continue', 'pass', 'import', 'from', 'class',
  'try', 'except', 'finally', 'raise', 'with', 'as', 'lambda', 'yield', 'global', 'nonlocal', 'del', 'assert',
  'async', 'await',
]);

export const PYTHON_OTHER_KEYWORDS = new Set(['and', 'or', 'not', 'in', 'is', 'True', 'False', 'None']);

export const PYTHON_BUILTIN_NAMES = new Set([
  'print', 'len', 'range', 'input', 'int', 'str', 'float', 'bool', 'list', 'dict', 'tuple', 'set', 'type', 'sum',
  'min', 'max', 'abs', 'round', 'sorted', 'enumerate', 'zip', 'open',
]);
