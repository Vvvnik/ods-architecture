import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import { isElasticsearchAvailable } from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();
const projectId = process.env.GRAPH_TEST_PROJECT_ID ?? '4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a';

describe.skipIf(!esAvailable)('Graph API integration', () => {
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

  it('returns graph summary and file dependencies for an analyzed project', async () => {
    const summaryResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/graph/summary`,
    });

    if (summaryResponse.statusCode === 404) {
      return;
    }

    expect(summaryResponse.statusCode).toBe(200);
    const summary = summaryResponse.json() as {
      node_count: number;
      analysis_run_id: string;
    };
    expect(summary.node_count).toBeGreaterThan(0);
    expect(summary.analysis_run_id).toBeTruthy();

    const filePath = encodeURIComponent('Program.cs');
    const depsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/graph/files/${filePath}/dependencies`,
    });

    expect(depsResponse.statusCode).toBe(200);
    const deps = depsResponse.json() as {
      path: string;
      nodes: Array<{ kind: string; path: string }>;
    };
    expect(deps.path).toBe('Program.cs');
    expect(deps.nodes.length).toBeGreaterThan(0);
    expect(deps.nodes[0]?.path).toBe('Program.cs');
  });
});
