/**
 * Split parser file lists so each spawn produces a bounded native extract.
 * Ingest runs per chunk; ES stores metadata only (no full model blob).
 *
 * Tiny last-chunk merge (026 R2): if the trailing remainder is &lt; 10% of
 * chunk size, fold it into the previous chunk to avoid an extra round-trip.
 */
export function chunkFiles(files: string[], chunkSize: number): string[][] {
  const size = Math.max(1, Math.floor(chunkSize));
  if (files.length === 0) {
    return [];
  }
  const chunks: string[][] = [];
  for (let i = 0; i < files.length; i += size) {
    chunks.push(files.slice(i, i + size));
  }

  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1]!;
    const threshold = Math.max(1, Math.floor(size * 0.1));
    if (last.length > 0 && last.length < threshold) {
      const prev = chunks[chunks.length - 2]!;
      chunks[chunks.length - 2] = prev.concat(last);
      chunks.pop();
    }
  }

  return chunks;
}
