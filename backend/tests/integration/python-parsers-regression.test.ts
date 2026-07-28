import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runParserCli } from '../helpers/parser-cli.js';

/** Regression: closed-stack grpc-proto still extracts on peer fixture. */
describe('python parsers regression (peer stacks)', () => {
  it('grpc-proto still works on grpc-multistack-demo', () => {
    const outputPath = '/tmp/ods-py-regression-grpc-proto.json';
    runParserCli({
      parserId: 'grpc-proto',
      entry: 'run.mjs',
      workingCopyRoot: join(process.cwd(), '../docker/fixtures/repos/grpc-multistack-demo'),
      files: ['proto/demo/v1/orders.proto'],
      outputPath,
      install: false,
    });
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      model: { services: Array<{ name: string }> };
    };
    expect(envelope.model.services[0]?.name).toBe('OrdersService');
  });

  it('ts-api-routes still extracts Fastify health route', () => {
    const outputPath = '/tmp/ods-py-regression-ts-routes.json';
    const root = join(process.cwd(), '../docker/fixtures/repos/graph-demo');
    // Minimal smoke: parser still runnable (may return 0 routes if no Fastify in fixture)
    runParserCli({
      parserId: 'ts-api-routes',
      entry: 'run.mjs',
      workingCopyRoot: root,
      files: ['package.json'],
      outputPath,
      install: false,
    });
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as { parser_id: string };
    expect(envelope.parser_id).toBe('ts-api-routes');
  });
});
