/**
 * Whether a draft has anything beyond the placeholder "write your solution
 * here" leading comment line — used to enable/disable the sidebar's play
 * button. Ported from the prototype's `hasRealCode`.
 */
export function hasRealCode(draft: string | undefined): boolean {
  if (!draft) return false;
  const stripped = draft.replace(/^--[^\n]*\n?/, '').trim();
  return stripped.length > 0;
}
