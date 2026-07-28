import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { detectArtifacts } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

const fixtureRoot = join(process.cwd(), '../docker/fixtures/repos/python-http-grpc-demo');

describe('python parsers confirm/status (detector)', () => {
  it('marks three Python artifact modules available on DoD fixture files', async () => {
    const paths = await listAllFilePaths(fixtureRoot, []);
    const artifacts = await detectArtifacts(fixtureRoot, paths);
    const byId = Object.fromEntries(artifacts.map((a) => [a.parser_id, a]));

    expect(byId['python-api-routes']?.file_count ?? 0).toBeGreaterThan(0);
    expect(byId['python-http-calls']?.file_count ?? 0).toBeGreaterThan(0);
    expect(byId['python-grpc-calls']?.file_count ?? 0).toBeGreaterThan(0);
    expect(byId['grpc-proto']?.file_count ?? 0).toBeGreaterThan(0);
  });
});
