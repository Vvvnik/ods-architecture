import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  DATA_ROOT: z.string().min(1).default('./data'),
  LOCAL_REPOS_MOUNT: z.string().min(1).default('/repos'),
  GIT_CLONE_DEPTH: z.coerce.number().int().positive().default(1),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse({
    PORT: env.PORT,
    ELASTICSEARCH_URL: env.ELASTICSEARCH_URL,
    DATA_ROOT: env.DATA_ROOT,
    LOCAL_REPOS_MOUNT: env.LOCAL_REPOS_MOUNT,
    GIT_CLONE_DEPTH: env.GIT_CLONE_DEPTH,
  });
}
