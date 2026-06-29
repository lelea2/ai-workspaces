export type DiffChunk = { type: 'equal' | 'delete' | 'insert'; text: string }

function lcs(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

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

export function diffLines(oldText: string, newText: string): DiffChunk[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const common = lcs(oldLines, newLines)

  const chunks: DiffChunk[] = []
  let oi = 0
  let ni = 0
  let ci = 0

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
  while (oi < oldLines.length) chunks.push({ type: 'delete', text: oldLines[oi++] })
  while (ni < newLines.length) chunks.push({ type: 'insert', text: newLines[ni++] })

  return chunks
}
