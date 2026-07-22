import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import { isElasticsearchAvailable } from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();
const projectId =
  process.env.GRAPH_TEST_PROJECT_ID ?? 'b0436d50-80f0-4293-8bfb-e706f432c645';

describe.skipIf(!esAvailable)('Graph UI overview API (020)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    app = await buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns GraphUiSlice shape for overview', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/graph/ui`,
    });

    if (response.statusCode === 404) {
      return;
    }

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      project_id: string;
      analysis_run_id: string;
      app_id: string | null;
      empty_reason: string | null;
      nodes: unknown[];
      edges: unknown[];
    };
    expect(body.project_id).toBe(projectId);
    expect(body.analysis_run_id).toBeTruthy();
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(Array.isArray(body.edges)).toBe(true);
    if (body.nodes.length === 0) {
      expect(['no_ui_landscape', 'no_screens', 'unknown']).toContain(body.empty_reason);
    }
  });
});
