import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { ParserWorkerSession } from '../../src/services/parser-worker-session.js';

const fakeWorkerJs = `
import readline from 'node:readline';
import { writeFileSync } from 'node:fs';
process.stdout.write(JSON.stringify({ op: 'ready' }) + '\\n');
const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  const msg = JSON.parse(line);
  if (msg.op === 'shutdown') {
    process.stdout.write(JSON.stringify({ op: 'bye' }) + '\\n');
    process.exit(0);
  }
  writeFileSync(msg.output, JSON.stringify({ ok: true }));
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

describe('ParserWorkerSession', () => {
  it('ready → chunk ok → shutdown', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ods-worker-fake-'));
    const script = join(dir, 'fake-worker.mjs');
    await writeFile(script, fakeWorkerJs, 'utf8');

    const session = await ParserWorkerSession.start({
      command: 'node',
      args: [script],
      cwd: dir,
      timeoutMs: 5_000,
    });
    const out = join(dir, 'envelope.json');
    const list = join(dir, 'files.txt');
    await writeFile(list, 'a.ts\n', 'utf8');
    await session.runChunk(0, list, out);
    await session.shutdown();
  });

  it('times out when worker never responds', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ods-worker-hang-'));
    const script = join(dir, 'hang.mjs');
    await writeFile(
      script,
      `process.stdout.write(JSON.stringify({ op: 'ready' }) + '\\n');
await new Promise((r) => setTimeout(r, 30_000));
`,
      'utf8',
    );

    const session = await ParserWorkerSession.start({
      command: 'node',
      args: [script],
      cwd: dir,
      timeoutMs: 200,
    });
    const out = join(dir, 'envelope.json');
    const list = join(dir, 'files.txt');
    await writeFile(list, 'a.ts\n', 'utf8');
    await expect(session.runChunk(0, list, out)).rejects.toThrow(/timed out|exited/i);
    session.kill();
  });
});
