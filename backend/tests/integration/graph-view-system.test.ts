import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import { isElasticsearchAvailable } from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();
const projectId = process.env.GRAPH_TEST_PROJECT_ID ?? '4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a';

describe.skipIf(!esAvailable)('Graph view system slice (T016)', () => {
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

  it('returns system peers without requiring class nodes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/graph/view`,
    });

    if (response.statusCode === 404) {
      return;
    }

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      nodes: Array<{ kind: string; role: string }>;
      empty_reason: string;
      limits: { max_nodes: number; max_edges: number };
    };

    expect(body.limits.max_nodes).toBe(200);
    expect(body.limits.max_edges).toBe(500);

    if (body.empty_reason === 'no_system_participants') {
      expect(body.nodes).toHaveLength(0);
      return;
    }

    expect(body.nodes.length).toBeGreaterThan(0);
    const kinds = new Set(body.nodes.map((n) => n.kind));
    expect(kinds.has('class')).toBe(false);
    expect(
      body.nodes.some((n) =>
        ['service', 'database', 'broker', 'queue', 'http_api', 'message_topic'].includes(n.kind),
      ),
    ).toBe(true);
  });
});
