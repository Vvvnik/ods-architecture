/**
 * Split parser file lists so each spawn produces a bounded native extract.
 * Ingest runs per chunk; ES stores metadata only (no full model blob).
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
  return chunks;
}
