import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { reactUiIngestAdapter } from './react-ui.ingest.js';

/** Same native UI tree → graph transform as react-ui; distinct parser_id. */
export const angularUiIngestAdapter: IngestAdapter = {
  parser_id: 'angular-ui',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    return reactUiIngestAdapter.transform(model, ctx);
  },
};
