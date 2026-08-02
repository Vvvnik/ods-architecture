import { z } from 'zod';

export const aiGraphWorkingCopyContentQuerySchema = z.object({
  path: z.string().min(1),
});

export const aiGraphIngestSchema = z.object({
  analysis_run_id: z.string().uuid(),
  items: z.array(z.unknown()).min(1).max(1_000),
});
