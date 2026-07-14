import { execSync } from 'node:child_process';
import { join } from 'node:path';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const ANALYSIS_RUN_ID = '00000000-0000-4000-8000-000000000002';

export function runParserCli(options: {
  parserId: string;
  entry?: string;
  workingCopyRoot: string;
  files: string[];
  outputPath: string;
  install?: boolean;
}): void {
  const parserRoot = join(process.cwd(), `../parsers/${options.parserId}`);
  const entry = options.entry ?? 'run.mjs';
  const entryPath = join(parserRoot, entry);

  if (options.install !== false && entry.endsWith('.mjs')) {
    execSync('npm install --no-fund --no-audit', { cwd: parserRoot, stdio: 'pipe' });
  }

  const filesJson = JSON.stringify(options.files);
  const runner = entry.endsWith('.sh') ? 'bash' : 'node';
  const command =
    `${runner} "${entryPath}" ` +
    `--project-id ${PROJECT_ID} ` +
    `--working-copy-root "${options.workingCopyRoot}" ` +
    `--analysis-run-id ${ANALYSIS_RUN_ID} ` +
    `--files '${filesJson}' ` +
    `--output "${options.outputPath}"`;

  execSync(command, { stdio: 'pipe' });
}
