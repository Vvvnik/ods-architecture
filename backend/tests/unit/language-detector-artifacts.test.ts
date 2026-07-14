import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { detectArtifacts, pathsMatchingArtifact } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('language-detector artifacts', () => {
  it('detects compose and appsettings globs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-artifacts-'));
    await writeFile(join(root, 'docker-compose.yml'), 'services:\n  api:\n    image: api\n', 'utf8');
    await writeFile(join(root, 'appsettings.json'), '{"ConnectionStrings":{}}', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);

    expect(artifacts.map((entry) => entry.artifact_type)).toEqual(
      expect.arrayContaining(['compose', 'appsettings']),
    );
  });

  it('resolves bus tie-break to bus-rabbit when both signals present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-bus-'));
    await writeFile(
      join(root, 'appsettings.json'),
      JSON.stringify({ RabbitMQ: {}, Kafka: { BootstrapServers: 'x' } }),
      'utf8',
    );
    await writeFile(
      join(root, 'Worker.csproj'),
      '<Project><ItemGroup><PackageReference Include="Confluent.Kafka" /></ItemGroup></Project>',
      'utf8',
    );

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const bus = artifacts.find((entry) => entry.artifact_type === 'bus');

    expect(bus?.parser_id).toBe('bus-rabbit');
  });

  it('classifies artifact paths for incremental change-set', async () => {
    const paths = ['docker-compose.yml', 'src/Api.cs', 'appsettings.Development.json'];
    expect(pathsMatchingArtifact(paths, 'compose')).toEqual(['docker-compose.yml']);
    expect(pathsMatchingArtifact(paths, 'appsettings')).toEqual(['appsettings.Development.json']);
  });

  it('does not treat kafka appsettings substring without json key as signal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-bus-kafka-fp-'));
    await writeFile(
      join(root, 'appsettings.json'),
      JSON.stringify({ Note: 'BootstrapServers mentioned in text only' }),
      'utf8',
    );

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);

    expect(artifacts.find((entry) => entry.artifact_type === 'bus')).toBeUndefined();
  });
});
