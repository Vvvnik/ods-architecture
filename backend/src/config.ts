import { z } from 'zod';

const DEFAULT_DETECTOR_DENYLIST = [
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'target',
  '.idea',
  '.vscode',
  // Test / fixture trees: fake app.get / apiFetch must not become system API edges
  'tests',
  '__tests__',
  '__mocks__',
] as const;

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  DATA_ROOT: z.string().min(1).default('./data'),
  LOCAL_REPOS_MOUNT: z.string().min(1).default('/repos'),
  GIT_CLONE_DEPTH: z.coerce.number().int().positive().default(1),
  PARSERS_ROOT: z.string().min(1).default('./parsers'),
  ANALYSIS_PARSER_TIMEOUT_MS: z.coerce.number().int().positive().default(600_000),
  ANALYSIS_MAX_PARALLEL_PARSERS: z.coerce.number().int().positive().default(2),
  ANALYSIS_DETECTOR_DENYLIST: z
    .string()
    .default(DEFAULT_DETECTOR_DENYLIST.join(','))
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse({
    PORT: env.PORT,
    ELASTICSEARCH_URL: env.ELASTICSEARCH_URL,
    DATA_ROOT: env.DATA_ROOT,
    LOCAL_REPOS_MOUNT: env.LOCAL_REPOS_MOUNT,
    GIT_CLONE_DEPTH: env.GIT_CLONE_DEPTH,
    PARSERS_ROOT: env.PARSERS_ROOT,
    ANALYSIS_PARSER_TIMEOUT_MS: env.ANALYSIS_PARSER_TIMEOUT_MS,
    ANALYSIS_MAX_PARALLEL_PARSERS: env.ANALYSIS_MAX_PARALLEL_PARSERS,
    ANALYSIS_DETECTOR_DENYLIST: env.ANALYSIS_DETECTOR_DENYLIST,
  });
}
