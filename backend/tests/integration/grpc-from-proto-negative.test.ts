import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { grpcProtoIngestAdapter } from '../../src/services/ingest/adapters/grpc-proto.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('grpc-from-proto negative', () => {
  it('does not create grpc nodes/edges when repo has no proto files', () => {
    const root = mkdtempSync(join(tmpdir(), 'ods-no-proto-'));
    try {
      writeFileSync(join(root, 'README.md'), '# no proto here', 'utf8');
      const outputPath = join(root, 'grpc-proto-envelope.json');
      runParserCli({
        parserId: 'grpc-proto',
        entry: 'run.mjs',
        workingCopyRoot: root,
        files: ['README.md'],
        outputPath,
        install: false,
      });
      const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
        model: { services: unknown[] };
      };
      expect(envelope.model.services).toHaveLength(0);
      const ingested = grpcProtoIngestAdapter.transform(
        envelope.model,
        {
          project_id: 'p1',
          analysis_run_id: 'r1',
          parser_id: 'grpc-proto',
          schema_version: '1',
          files_analyzed: ['README.md'],
          incremental: false,
          affected_paths: [],
          deleted_paths: [],
        },
      );
      expect(ingested.nodes.some((node) => node.kind === 'grpc_method')).toBe(false);
      expect(
        ingested.edges.some(
          (edge) => edge.type === 'http_calls' && edge.metadata?.protocol === 'grpc',
        ),
      ).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
