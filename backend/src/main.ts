import { mkdir } from 'node:fs/promises';

import { buildApp } from './index.js';

async function main() {
  const app = await buildApp();
  await mkdir(app.config.DATA_ROOT, { recursive: true });
  await app.listen({ port: app.config.PORT, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
