import type { IngestAdapter } from '../types.js';
import { transformApiRoutes } from './api-routes.ingest.js';

export const pythonApiRoutesIngestAdapter: IngestAdapter = {
  parser_id: 'python-api-routes',
  supported_schema_versions: ['1'],
  transform(model, ctx) {
    return transformApiRoutes(model, ctx, 'python');
  },
};
