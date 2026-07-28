import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

describe('parser run.sh sources require-prebuilt', () => {
  it('csharp and java run.sh source the shared helper', async () => {
    const csharp = await readFile(join(repoRoot, 'parsers/csharp/run.sh'), 'utf8');
    const java = await readFile(join(repoRoot, 'parsers/java/run.sh'), 'utf8');
    expect(csharp).toMatch(/_common\/require-prebuilt\.sh/);
    expect(java).toMatch(/_common\/require-prebuilt\.sh/);
  });
});
