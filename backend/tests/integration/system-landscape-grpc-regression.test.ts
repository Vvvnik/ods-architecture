import { describe, expect, it } from 'vitest';
import { detectArtifacts } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('system landscape grpc regression', () => {
  it('does not classify system-landscape-demo as grpc-proto when proto is absent', async () => {
    const root = `${process.cwd()}/../docker/fixtures/repos/system-landscape-demo`;
    const paths = await listAllFilePaths(root, ['node_modules', 'dist', 'bin', 'obj']);
    const artifacts = await detectArtifacts(root, paths);
    expect(artifacts.some((entry) => entry.artifact_type === 'grpc-proto')).toBe(false);
  });
});
