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
  /** Absolute host path mounted at LOCAL_REPOS_MOUNT (Docker). Enables host-path local_path. */
  LOCAL_REPOS_HOST_PATH: z.string().default(''),
  /** Extra host→container roots: `/host/a:/repos-a,/host/b:/repos-b`. */
  LOCAL_PATH_MAP: z.string().default(''),
  GIT_CLONE_DEPTH: z.coerce.number().int().positive().default(1),
  PARSERS_ROOT: z.string().min(1).default('./parsers'),
  PUBLIC_API_BASE_URL: z.string().default(''),
  DOCS_PROMPT_TEMPLATE: z.string().min(1).default('./prompts/docs-agent-prompt.md'),
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
    LOCAL_REPOS_HOST_PATH: env.LOCAL_REPOS_HOST_PATH,
    LOCAL_PATH_MAP: env.LOCAL_PATH_MAP,
    GIT_CLONE_DEPTH: env.GIT_CLONE_DEPTH,
    PARSERS_ROOT: env.PARSERS_ROOT,
    PUBLIC_API_BASE_URL: env.PUBLIC_API_BASE_URL,
    DOCS_PROMPT_TEMPLATE: env.DOCS_PROMPT_TEMPLATE,
    ANALYSIS_PARSER_TIMEOUT_MS: env.ANALYSIS_PARSER_TIMEOUT_MS,
    ANALYSIS_MAX_PARALLEL_PARSERS: env.ANALYSIS_MAX_PARALLEL_PARSERS,
    ANALYSIS_DETECTOR_DENYLIST: env.ANALYSIS_DETECTOR_DENYLIST,
  });
}
