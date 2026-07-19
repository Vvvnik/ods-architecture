import type { IngestAdapter } from '../types.js';
import { transformApiRoutes } from './api-routes.ingest.js';

export const javaApiRoutesIngestAdapter: IngestAdapter = {
  parser_id: 'java-api-routes',
  supported_schema_versions: ['1'],
  transform(model, ctx) {
    return transformApiRoutes(model, ctx, 'java');
  },
};
