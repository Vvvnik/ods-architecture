/**
 * Python native model — parser emits schema_version 1; ingest accepts 1|2 via shared adapter (008).
 */
import { createSymbolsModelIngestAdapter } from './symbols-model.ingest.js';

export const pythonIngestAdapter = createSymbolsModelIngestAdapter('python', 'python');
