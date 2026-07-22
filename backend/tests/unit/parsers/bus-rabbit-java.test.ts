import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const PARSER = join(process.cwd(), '../parsers/bus-rabbit/run.mjs');

describe('bus-rabbit Java extract', () => {
  it('extracts @RabbitListener and convertAndSend', () => {
    const root = mkdtempSync(join(tmpdir(), 'ods-java-bus-'));
    const rel = 'orders-service/src/main/java/com/example/OrderListener.java';
    mkdirSync(join(root, 'orders-service/src/main/java/com/example'), { recursive: true });
    writeFileSync(
      join(root, rel),
      `
      class OrderListener {
        @RabbitListener(queues = "orders.created")
        public void onCreated(OrderCreatedEvent event) {}
        void publish() { rabbitTemplate.convertAndSend("orders.processed", event); }
      }
      `,
    );
    const out = join(root, 'out.json');
    const result = spawnSync(
      process.execPath,
      [
        PARSER,
        '--project-id', 'p',
        '--working-copy-root', root,
        '--analysis-run-id', 'r',
        '--files', JSON.stringify([rel]),
        '--output', out,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    const envelope = JSON.parse(readFileSync(out, 'utf8'));
    expect(envelope.model.service_hint).toBe('orders-service');
    expect(
      envelope.model.handlers.some(
        (h: { queue_hint?: string; role: string }) =>
          h.queue_hint === 'orders.created' && h.role === 'consumer',
      ),
    ).toBe(true);
    expect(envelope.model.handlers.some((h: { role: string }) => h.role === 'producer')).toBe(true);
  });
});
