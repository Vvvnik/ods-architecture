import { describe, expect, it } from 'vitest';
import { gradleProjectIngestAdapter } from '../../../src/services/ingest/adapters/gradle-project.ingest.js';

const ctx = {
  project_id: 'p',
  analysis_run_id: 'r',
  parser_id: 'gradle-project',
  schema_version: '1',
  files_analyzed: [],
  incremental: false,
  affected_paths: [],
  deleted_paths: [],
};

describe('gradle-project ingest', () => {
  it('creates only Boot services and adds Gradle metadata', () => {
    const result = gradleProjectIngestAdapter.transform(
      {
        modules: [
          { path: 'customers-service', artifact_id: 'customers-service', is_boot_app: true, build_file: 'build.gradle' },
          { path: 'library', artifact_id: 'library', is_boot_app: false },
        ],
      },
      ctx,
    );
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].metadata?.gradle_artifact_id).toBe('customers-service');
    expect(result.nodes[0].id).toContain('compose:service:');
    expect(result.nodes[0].name).toBe('customers-service');
  });

  it('keeps compose display name when candidates match', () => {
    const result = gradleProjectIngestAdapter.transform(
      {
        modules: [
          { path: 'customers-service', artifact_id: 'customers-service', is_boot_app: true },
        ],
      },
      { ...ctx, compose_service_names: ['customers-service', 'vets-service'] },
    );
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].name).toBe('customers-service');
    expect(result.nodes[0].id).toContain('#customers-service');
  });

  it('does not invent compose id when candidates exist but none match', () => {
    const result = gradleProjectIngestAdapter.transform(
      {
        modules: [{ path: 'odd-module', artifact_id: 'odd-module', is_boot_app: true }],
      },
      { ...ctx, compose_service_names: ['customers-service'] },
    );
    expect(result.nodes[0].id.startsWith('gradle-project:service:')).toBe(true);
  });
});
