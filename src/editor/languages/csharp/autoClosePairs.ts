// Bracket/quote auto-closing is language-agnostic (it only knows about
// `( [ { ' "`, nothing SQL-, Python-, or C#-specific) — reused as-is from
// the SQL track's implementation rather than duplicated.
export { applyAutoClose } from '../sql/autoClosePairs';
