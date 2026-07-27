import { describe, expect, it } from 'vitest';
import { mavenProjectIngestAdapter } from '../../../src/services/ingest/adapters/maven-project.ingest.js';
import { resolveComposeServiceNameFromHint } from '../../../src/services/ingest/maven-compose-merge.js';

const ctx = { project_id: 'p', analysis_run_id: 'r', parser_id: 'maven-project', schema_version: '1', files_analyzed: [], incremental: false, affected_paths: [], deleted_paths: [] };

describe('maven-project ingest', () => {
  it('creates only Boot services and adds Maven metadata', () => {
    const result = mavenProjectIngestAdapter.transform({ modules: [
      { path: 'customers-service', artifact_id: 'acme-platform-customers-service', is_boot_app: true },
      { path: '.', artifact_id: 'parent', packaging: 'pom', is_boot_app: false },
    ] }, ctx);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].metadata?.maven_artifact_id).toBe('acme-platform-customers-service');
    expect(result.nodes[0].id).toContain('compose:service:');
    expect(result.nodes[0].name).toBe('customers-service');
  });

  it('keeps compose display name when candidates match', () => {
    const result = mavenProjectIngestAdapter.transform(
      {
        modules: [
          {
            path: 'acme-platform-customers-service',
            artifact_id: 'acme-platform-customers-service',
            is_boot_app: true,
          },
        ],
      },
      { ...ctx, compose_service_names: ['customers-service', 'vets-service'] },
    );
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].name).toBe('customers-service');
    expect(result.nodes[0].id).toContain('#customers-service');
  });

  it('does not invent compose id when candidates exist but none match', () => {
    const result = mavenProjectIngestAdapter.transform(
      {
        modules: [
          { path: 'odd-module', artifact_id: 'odd-module', is_boot_app: true },
        ],
      },
      { ...ctx, compose_service_names: ['customers-service'] },
    );
    expect(result.nodes[0].id.startsWith('maven-project:service:')).toBe(true);
  });

  it('does not merge an ambiguous normalized name', () => {
    expect(resolveComposeServiceNameFromHint('customers-service', ['customers', 'customers-service'])).toBeNull();
  });
});
