import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const helper = fileURLToPath(
  new URL('../../../parsers/_common/require-prebuilt.sh', import.meta.url),
);

describe('require-prebuilt.sh', () => {
  it('fails when require=true and artifact missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ods-prebuilt-'));
    const script = join(dir, 'check.sh');
    await writeFile(
      script,
      `#!/usr/bin/env bash
set -euo pipefail
source "${helper}"
require_prebuilt_artifact "${dir}/missing.dll"
`,
      'utf8',
    );
    await chmod(script, 0o755);
    const result = spawnSync('bash', [script], {
      env: { ...process.env, ANALYSIS_REQUIRE_PREBUILT: 'true' },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/prebuilt artifact missing/i);
  });

  it('succeeds when require=true and artifact present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ods-prebuilt-'));
    const artifact = join(dir, 'present.dll');
    await writeFile(artifact, 'x', 'utf8');
    const script = join(dir, 'check.sh');
    await writeFile(
      script,
      `#!/usr/bin/env bash
set -euo pipefail
source "${helper}"
require_prebuilt_artifact "${artifact}"
`,
      'utf8',
    );
    await chmod(script, 0o755);
    const result = spawnSync('bash', [script], {
      env: { ...process.env, ANALYSIS_REQUIRE_PREBUILT: 'true' },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
  });

  it('allows missing artifact when require=false', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ods-prebuilt-'));
    const script = join(dir, 'check.sh');
    await writeFile(
      script,
      `#!/usr/bin/env bash
set -euo pipefail
source "${helper}"
require_prebuilt_artifact "${dir}/missing.dll"
`,
      'utf8',
    );
    await chmod(script, 0o755);
    const result = spawnSync('bash', [script], {
      env: { ...process.env, ANALYSIS_REQUIRE_PREBUILT: 'false' },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
  });
});
