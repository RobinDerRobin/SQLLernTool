// Rendered with the same CSS classes the SQL/Python tokenizers use
// (tok-keyword / tok-keywordAlt / tok-type / ...), so no new theme work is
// needed for this third language plugin.
export const CSHARP_KEYWORDS = new Set([
  'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return',
  'try', 'catch', 'finally', 'throw', 'new', 'using', 'namespace', 'class', 'struct', 'interface', 'enum',
  'public', 'private', 'protected', 'internal', 'static', 'override', 'virtual', 'abstract', 'sealed', 'base',
  'this', 'const', 'readonly', 'get', 'set', 'ref', 'out', 'params', 'where', 'yield', 'async', 'await',
  'delegate', 'event', 'lock', 'checked', 'unchecked',
]);

export const CSHARP_OTHER_KEYWORDS = new Set(['true', 'false', 'null', 'is', 'as', 'in', 'typeof', 'nameof']);

export const CSHARP_TYPES = new Set([
  'int', 'string', 'bool', 'double', 'float', 'decimal', 'char', 'void', 'var', 'object', 'long', 'short', 'byte',
  'uint', 'ulong', 'ushort', 'sbyte', 'dynamic',
]);
