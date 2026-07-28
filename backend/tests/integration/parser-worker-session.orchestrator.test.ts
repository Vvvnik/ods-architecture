import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { ParserWorkerSession } from '../../src/services/parser-worker-session.js';

const fakeWorkerJs = `
import readline from 'node:readline';
import { writeFileSync } from 'node:fs';
process.stdout.write(JSON.stringify({ op: 'ready' }) + '\\n');
let count = 0;
const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  const msg = JSON.parse(line);
  if (msg.op === 'shutdown') {
    process.stdout.write(JSON.stringify({ op: 'bye' }) + '\\n');
    process.exit(0);
  }
  count += 1;
  writeFileSync(msg.output, JSON.stringify({ n: count }));
  process.stdout.write(
    JSON.stringify({
      op: 'chunk_result',
      chunk_index: msg.chunk_index,
      status: 'ok',
      output: msg.output,
    }) + '\\n',
  );
}
`;

describe('parser-worker-session multi-chunk (integration-style)', () => {
  it('handles two chunks on one process', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ods-worker-2c-'));
    const script = join(dir, 'fake-worker.mjs');
    await writeFile(script, fakeWorkerJs, 'utf8');

    const session = await ParserWorkerSession.start({
      command: 'node',
      args: [script],
      cwd: dir,
      timeoutMs: 5_000,
    });
    for (const idx of [0, 1]) {
      const out = join(dir, `envelope-${idx}.json`);
      const list = join(dir, `files-${idx}.txt`);
      await writeFile(list, `f${idx}.ts\n`, 'utf8');
      await session.runChunk(idx, list, out);
    }
    await session.shutdown();
  });
});
