import { Client, type estypes } from '@elastic/elasticsearch';

import type { AppConfig } from '../config.js';

export const PROJECTS_INDEX = 'ods-projects';
export const ELEMENTS_INDEX = 'ods-elements';
export const LANGUAGE_REPORTS_INDEX = 'ods-language-reports';
export const ANALYSIS_RUNS_INDEX = 'ods-analysis-runs';
export const PARSER_ENVELOPES_INDEX = 'ods-parser-envelopes';
export const SYNC_SNAPSHOTS_INDEX = 'ods-sync-snapshots';
export const GRAPH_NODES_INDEX = 'ods-graph-nodes';
export const GRAPH_EDGES_INDEX = 'ods-graph-edges';

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

const languageReportsMappings = {
  properties: {
    id: { type: 'keyword' as const },
    project_id: { type: 'keyword' as const },
    detected_at: { type: 'date' as const },
    sync_id: { type: 'keyword' as const },
    languages: {
      type: 'nested' as const,
      properties: {
        language: { type: 'keyword' as const },
        file_count: { type: 'integer' as const },
        sample_paths: { type: 'keyword' as const },
        parser_id: { type: 'keyword' as const },
        parser_status: { type: 'keyword' as const },
      },
    },
    artifacts: {
      type: 'nested' as const,
      properties: {
        artifact_type: { type: 'keyword' as const },
        file_count: { type: 'integer' as const },
        sample_paths: { type: 'keyword' as const },
        parser_id: { type: 'keyword' as const },
        parser_status: { type: 'keyword' as const },
      },
    },
  },
};

const analysisRunsMappings = {
  properties: {
    id: { type: 'keyword' as const },
    project_id: { type: 'keyword' as const },
    language_report_id: { type: 'keyword' as const },
    status: { type: 'keyword' as const },
    started_at: { type: 'date' as const },
    completed_at: { type: 'date' as const },
    incremental: { type: 'boolean' as const },
    change_set: {
      properties: {
        project_id: { type: 'keyword' as const },
        incremental: { type: 'boolean' as const },
        added: { type: 'keyword' as const },
        modified: { type: 'keyword' as const },
        deleted: { type: 'keyword' as const },
      },
    },
    parser_results: {
      type: 'nested' as const,
      properties: {
        parser_id: { type: 'keyword' as const },
        status: { type: 'keyword' as const },
        error_message: { type: 'text' as const },
      },
    },
    last_error_message: { type: 'text' as const },
    ingest_status: { type: 'keyword' as const },
    ingest_completed_at: { type: 'date' as const },
    ingest_errors: {
      type: 'nested' as const,
      properties: {
        parser_id: { type: 'keyword' as const },
        message: { type: 'text' as const },
      },
    },
  },
};

const parserEnvelopesMappings = {
  properties: {
    id: { type: 'keyword' as const },
    project_id: { type: 'keyword' as const },
    analysis_run_id: { type: 'keyword' as const },
    parser_id: { type: 'keyword' as const },
    schema_version: { type: 'keyword' as const },
    generated_at: { type: 'date' as const },
    files_analyzed: { type: 'keyword' as const },
    model: { type: 'object' as const, enabled: true },
    stored_at: { type: 'date' as const },
  },
};

const syncSnapshotsMappings = {
  properties: {
    project_id: { type: 'keyword' as const },
    captured_at: { type: 'date' as const },
    files: {
      type: 'nested' as const,
      properties: {
        path: { type: 'keyword' as const },
        mtime_ms: { type: 'long' as const },
        size: { type: 'long' as const },
      },
    },
  },
};

const graphNodesMappings = {
  properties: {
    id: { type: 'keyword' as const },
    project_id: { type: 'keyword' as const },
    analysis_run_id: { type: 'keyword' as const },
    parser_id: { type: 'keyword' as const },
    kind: { type: 'keyword' as const },
    name: { type: 'keyword' as const },
    qualified_name: { type: 'keyword' as const },
    language: { type: 'keyword' as const },
    path: { type: 'keyword' as const },
    location: {
      properties: {
        start_line: { type: 'integer' as const },
        start_col: { type: 'integer' as const },
        end_line: { type: 'integer' as const },
        end_col: { type: 'integer' as const },
      },
    },
    element_id: { type: 'keyword' as const },
    parent_id: { type: 'keyword' as const },
    signature: { type: 'text' as const },
    metadata: { type: 'object' as const, enabled: true },
    ingested_at: { type: 'date' as const },
  },
};

const graphEdgesMappings = {
  properties: {
    id: { type: 'keyword' as const },
    project_id: { type: 'keyword' as const },
    analysis_run_id: { type: 'keyword' as const },
    parser_id: { type: 'keyword' as const },
    language: { type: 'keyword' as const },
    from: { type: 'keyword' as const },
    to: { type: 'keyword' as const },
    type: { type: 'keyword' as const },
    path: { type: 'keyword' as const },
    location: {
      properties: {
        start_line: { type: 'integer' as const },
        start_col: { type: 'integer' as const },
        end_line: { type: 'integer' as const },
        end_col: { type: 'integer' as const },
      },
    },
    metadata: { type: 'object' as const, enabled: true },
    ingested_at: { type: 'date' as const },
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
  await ensureIndex(client, LANGUAGE_REPORTS_INDEX, languageReportsMappings);
  await ensureIndex(client, ANALYSIS_RUNS_INDEX, analysisRunsMappings);
  await ensureIndex(client, PARSER_ENVELOPES_INDEX, parserEnvelopesMappings);
  await ensureIndex(client, SYNC_SNAPSHOTS_INDEX, syncSnapshotsMappings);
  await ensureIndex(client, GRAPH_NODES_INDEX, graphNodesMappings);
  await ensureIndex(client, GRAPH_EDGES_INDEX, graphEdgesMappings);
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
