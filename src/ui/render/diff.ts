export interface DiffLine {
  text: string;
  differs: boolean;
}

export interface LineDiff {
  mine: DiffLine[];
  theirs: DiffLine[];
}

/**
 * Positional line-by-line comparison (not a real LCS diff) — ported from the
 * prototype's compare view: line N of the user's code is compared to line N
 * of the model solution, whitespace-insensitively, and both sides are padded
 * so the two columns stay aligned.
 */
export function computeLineDiff(mine: string, theirs: string): LineDiff {
  const mineLines = mine.split('\n');
  const theirLines = theirs.split('\n');
  const length = Math.max(mineLines.length, theirLines.length);

  const result: LineDiff = { mine: [], theirs: [] };
  for (let i = 0; i < length; i++) {
    const a = mineLines[i] ?? '';
    const b = theirLines[i] ?? '';
    const differs = a.trim() !== b.trim();
    result.mine.push({ text: a, differs });
    result.theirs.push({ text: b, differs });
  }
  return result;
}
