import { mkdtemp, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { detectArtifacts } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';
import { runParserCli } from '../helpers/parser-cli.js';

const fixtureRoot = join(process.cwd(), '../docker/fixtures/repos/python-http-grpc-demo');

describe('python parsers detector + negative', () => {
  it('detects python-api-routes / http-calls / grpc-calls from content hints', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-py-art-'));
    await writeFile(
      join(root, 'app.py'),
      'from fastapi import FastAPI\napp = FastAPI()\n@app.get("/x")\ndef x(): ...\n',
      'utf8',
    );
    await writeFile(join(root, 'client.py'), 'import httpx\nhttpx.get("http://x/y")\n', 'utf8');
    await writeFile(
      join(root, 'grpc_c.py'),
      'import grpc\nstub = OrdersServiceStub(channel)\nstub.GetOrder(req)\n',
      'utf8',
    );
    const paths = await listAllFilePaths(root, []);
    const artifacts = await detectArtifacts(root, paths);
    const ids = artifacts.map((a) => a.parser_id);
    expect(ids).toEqual(
      expect.arrayContaining(['python-api-routes', 'python-http-calls', 'python-grpc-calls']),
    );
  });

  it('emits empty routes when no python sources are listed', () => {
    const outputPath = '/tmp/ods-python-negative-routes.json';
    runParserCli({
      parserId: 'python-api-routes',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: ['README.md'],
      outputPath,
      install: false,
    });
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      model: { routes: unknown[] };
    };
    expect(envelope.model.routes).toEqual([]);
  });
});
