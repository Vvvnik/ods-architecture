import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runParserCli } from '../helpers/parser-cli.js';

describe('grpc-proto parser CLI', () => {
  it('extracts services[] from fixture proto', () => {
    const outputPath = '/tmp/ods-grpc-proto-envelope.json';
    runParserCli({
      parserId: 'grpc-proto',
      entry: 'run.mjs',
      workingCopyRoot: `${process.cwd()}/../docker/fixtures/repos/grpc-multistack-demo`,
      files: ['proto/demo/v1/orders.proto'],
      outputPath,
      install: false,
    });
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      model: { services: Array<{ name: string; methods: Array<{ name: string }> }> };
    };
    expect(envelope.parser_id).toBe('grpc-proto');
    expect(envelope.model.services[0]?.name).toBe('OrdersService');
    expect(envelope.model.services[0]?.methods[0]?.name).toBe('GetOrder');
  });
});
