/**
 * Java native model — symbols schema 1+2 via shared adapter (018 / 023).
 * Normal parser runs emit schema_version 2 (methods + usages calls).
 * See specs/023-java-calls/contracts/ingest-java-v2.md
 */
import { createSymbolsModelIngestAdapter } from './symbols-model.ingest.js';

export const javaIngestAdapter = createSymbolsModelIngestAdapter('java', 'java');
