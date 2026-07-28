import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

export type ParserWorkerStartOptions = {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
};

/**
 * Long-lived `--ods-worker` session: NDJSON on stdin/stdout per
 * specs/026-parser-pipeline-perf/contracts/parser-worker-protocol.md
 */
export class ParserWorkerSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly timeoutMs: number;
  private readonly lineQueue: string[] = [];
  private lineWaiters: Array<(line: string | null) => void> = [];
  private closed = false;
  private stderr = '';

  private constructor(child: ChildProcessWithoutNullStreams, timeoutMs: number) {
    this.child = child;
    this.timeoutMs = timeoutMs;

    child.stderr.on('data', (chunk: Buffer) => {
      this.stderr += chunk.toString();
    });

    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      const waiter = this.lineWaiters.shift();
      if (waiter) {
        waiter(line);
      } else {
        this.lineQueue.push(line);
      }
    });
    rl.on('close', () => {
      this.closed = true;
      while (this.lineWaiters.length > 0) {
        this.lineWaiters.shift()?.(null);
      }
    });

    child.on('error', () => {
      this.closed = true;
      while (this.lineWaiters.length > 0) {
        this.lineWaiters.shift()?.(null);
      }
    });
  }

  static async start(opts: ParserWorkerStartOptions): Promise<ParserWorkerSession> {
    const child = spawn(opts.command, opts.args, {
      cwd: opts.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;

    const session = new ParserWorkerSession(child, opts.timeoutMs);
    const ready = await session.readLine(opts.timeoutMs);
    if (!ready) {
      session.kill();
      throw new Error(
        `Parser worker failed to become ready${session.stderr ? `: ${session.stderr.trim()}` : ''}`,
      );
    }
    let parsed: { op?: string };
    try {
      parsed = JSON.parse(ready) as { op?: string };
    } catch {
      session.kill();
      throw new Error(`Parser worker ready line is not JSON: ${ready}`);
    }
    if (parsed.op !== 'ready') {
      session.kill();
      throw new Error(`Parser worker expected op=ready, got: ${ready}`);
    }
    return session;
  }

  async runChunk(chunkIndex: number, fileListPath: string, outputPath: string): Promise<void> {
    const request = JSON.stringify({
      op: 'chunk',
      chunk_index: chunkIndex,
      file_list: fileListPath,
      output: outputPath,
    });
    this.writeLine(request);
    const responseLine = await this.readLine(this.timeoutMs);
    if (!responseLine) {
      this.kill();
      throw new Error(
        `Parser worker timed out or exited on chunk ${chunkIndex}${
          this.stderr ? `: ${this.stderr.trim()}` : ''
        }`,
      );
    }
    let response: {
      op?: string;
      chunk_index?: number;
      status?: string;
      message?: string;
    };
    try {
      response = JSON.parse(responseLine) as typeof response;
    } catch {
      this.kill();
      throw new Error(`Parser worker chunk response is not JSON: ${responseLine}`);
    }
    if (response.op !== 'chunk_result' || response.chunk_index !== chunkIndex) {
      this.kill();
      throw new Error(`Unexpected worker chunk_result: ${responseLine}`);
    }
    if (response.status !== 'ok') {
      throw new Error(response.message ?? `Parser worker chunk ${chunkIndex} failed`);
    }
  }

  async shutdown(): Promise<void> {
    if (this.closed) {
      return;
    }
    try {
      this.writeLine(JSON.stringify({ op: 'shutdown' }));
    } catch {
      this.kill();
      return;
    }
    await Promise.race([
      new Promise<void>((resolve) => {
        this.child.once('close', () => resolve());
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          this.kill();
          resolve();
        }, Math.min(5_000, this.timeoutMs));
      }),
    ]);
  }

  kill(): void {
    try {
      this.child.kill('SIGKILL');
    } catch {
      // ignore
    }
  }

  getStderr(): string {
    return this.stderr.trim();
  }

  private writeLine(line: string): void {
    if (this.closed || !this.child.stdin.writable) {
      throw new Error('Parser worker stdin is closed');
    }
    this.child.stdin.write(`${line}\n`);
  }

  private readLine(timeoutMs: number): Promise<string | null> {
    if (this.lineQueue.length > 0) {
      return Promise.resolve(this.lineQueue.shift()!);
    }
    if (this.closed) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const idx = this.lineWaiters.indexOf(onLine);
        if (idx >= 0) {
          this.lineWaiters.splice(idx, 1);
        }
        resolve(null);
      }, timeoutMs);

      const onLine = (line: string | null) => {
        clearTimeout(timer);
        resolve(line);
      };
      this.lineWaiters.push(onLine);
    });
  }
}
