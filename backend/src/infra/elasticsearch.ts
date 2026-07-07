import { Client, type estypes } from '@elastic/elasticsearch';

import type { AppConfig } from '../config.js';

export const PROJECTS_INDEX = 'ods-projects';
export const ELEMENTS_INDEX = 'ods-elements';

const projectsMappings = {
  properties: {
    id: { type: 'keyword' as const },
    name: { type: 'text' as const, fields: { keyword: { type: 'keyword' as const } } },
    source_type: { type: 'keyword' as const },
    source_value: { type: 'keyword' as const },
    working_copy_root: { type: 'keyword' as const },
    created_at: { type: 'date' as const },
    last_sync_at: { type: 'date' as const },
    sync_status: { type: 'keyword' as const },
    last_error_message: { type: 'text' as const },
  },
};

const elementsMappings = {
  properties: {
    id: { type: 'keyword' as const },
    project_id: { type: 'keyword' as const },
    path: { type: 'keyword' as const },
    parent_path: { type: 'keyword' as const },
    type: { type: 'keyword' as const },
    status: { type: 'keyword' as const },
    is_active: { type: 'boolean' as const },
    status_manually_set: { type: 'boolean' as const },
  },
};

const indexSettings = {
  number_of_shards: 1,
  number_of_replicas: 0,
};

export function createElasticsearchClient(config: AppConfig): Client {
  return new Client({ node: config.ELASTICSEARCH_URL });
}

export async function bootstrapIndices(client: Client): Promise<void> {
  await ensureIndex(client, PROJECTS_INDEX, projectsMappings);
  await ensureIndex(client, ELEMENTS_INDEX, elementsMappings);
}

async function ensureIndex(
  client: Client,
  index: string,
  mappings: estypes.MappingTypeMapping,
): Promise<void> {
  const exists = await client.indices.exists({ index });
  if (exists) {
    return;
  }

  await client.indices.create({
    index,
    settings: indexSettings,
    mappings,
  });
}

export async function pingElasticsearch(client: Client): Promise<boolean> {
  try {
    const ok = await client.ping();
    return ok;
  } catch {
    return false;
  }
}
