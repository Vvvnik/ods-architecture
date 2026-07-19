import { describe, expect, it } from 'vitest';
import { mavenProjectIngestAdapter } from '../../../src/services/ingest/adapters/maven-project.ingest.js';
import { resolveComposeServiceNameFromHint } from '../../../src/services/ingest/maven-compose-merge.js';

const ctx = { project_id: 'p', analysis_run_id: 'r', parser_id: 'maven-project', schema_version: '1', files_analyzed: [], incremental: false, affected_paths: [], deleted_paths: [] };

describe('maven-project ingest', () => {
  it('creates only Boot services and adds Maven metadata', () => {
    const result = mavenProjectIngestAdapter.transform({ modules: [
      { path: 'customers-service', artifact_id: 'spring-petclinic-customers-service', is_boot_app: true },
      { path: '.', artifact_id: 'parent', packaging: 'pom', is_boot_app: false },
    ] }, ctx);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].metadata?.maven_artifact_id).toBe('spring-petclinic-customers-service');
    expect(result.nodes[0].id).toContain('compose:service:');
  });

  it('does not merge an ambiguous normalized name', () => {
    expect(resolveComposeServiceNameFromHint('customers-service', ['customers', 'customers-service'])).toBeNull();
  });
});
