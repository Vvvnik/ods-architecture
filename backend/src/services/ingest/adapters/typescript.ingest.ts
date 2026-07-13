/**
 * TypeScript native model — тот же schema_version=1, что csharp/python/cpp.
 */
import { createSymbolsModelV1IngestAdapter } from './symbols-model-v1.ingest.js';

export const typescriptIngestAdapter = createSymbolsModelV1IngestAdapter(
  'typescript',
  'typescript',
);
