/**
 * Native model schema_version=1 (Roslyn extract, same shape as symbols model v1).
 */
import { createSymbolsModelV1IngestAdapter } from './symbols-model-v1.ingest.js';

export const csharpIngestAdapter = createSymbolsModelV1IngestAdapter('csharp', 'csharp');
