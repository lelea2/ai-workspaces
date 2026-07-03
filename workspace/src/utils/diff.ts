/**
 * diff.ts — Line-level diff utility used to compare an AI agent's suggested text
 * against the original document content.
 *
 * The result is an ordered list of DiffChunks, each tagged as:
 *   - 'equal'  — line present in both the original and the suggestion (unchanged)
 *   - 'delete' — line that exists only in the original (removed by the agent)
 *   - 'insert' — line that exists only in the suggestion (added by the agent)
 *
 * This powers the diff view in the AI panel, letting collaborators see exactly
 * what an agent proposes to change before accepting or rejecting the edit.
 */

// A single unit of diff output: the type of change and the affected line text.
export type DiffChunk = { type: 'equal' | 'delete' | 'insert'; text: string }

/**
 * Computes the Longest Common Subsequence (LCS) of two string arrays.
 * Used internally by diffLines to identify lines shared between old and new text,
 * which anchors the diff algorithm and minimises spurious changes.
 */
function lcs(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  // dp[i][j] = length of LCS of a[0..i-1] and b[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

  // Backtrack through the DP table to reconstruct the common lines in order.
  const result: string[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  return result
}

/**
 * Produces a line-by-line diff between the original document text and the
 * agent's suggested replacement text.
 *
 * @param oldText - The current document content (before the agent's edit).
 * @param newText - The agent's proposed content.
 * @returns An array of DiffChunks in document order describing every line as
 *          equal, deleted, or inserted.
 */
export function diffLines(oldText: string, newText: string): DiffChunk[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  // Anchor points: lines that are the same in both versions.
  const common = lcs(oldLines, newLines)

  const chunks: DiffChunk[] = []
  let oi = 0 // cursor into oldLines
  let ni = 0 // cursor into newLines
  let ci = 0 // cursor into common (LCS)

  // Walk through each common (unchanged) line, emitting deletes and inserts
  // for everything between the previous common anchor and this one.
  while (ci < common.length) {
    while (oi < oldLines.length && oldLines[oi] !== common[ci])
      chunks.push({ type: 'delete', text: oldLines[oi++] })
    while (ni < newLines.length && newLines[ni] !== common[ci])
      chunks.push({ type: 'insert', text: newLines[ni++] })
    chunks.push({ type: 'equal', text: common[ci] })
    oi++
    ni++
    ci++
  }
  // Emit any trailing lines that appear only in one version.
  while (oi < oldLines.length) chunks.push({ type: 'delete', text: oldLines[oi++] })
  while (ni < newLines.length) chunks.push({ type: 'insert', text: newLines[ni++] })

  return chunks
}
