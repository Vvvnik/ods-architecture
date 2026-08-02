import { z } from 'zod';

export const docsPathQuerySchema = z.object({
  path: z.string().min(1),
});

export const writeDocsContentSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  job_id: z.string().uuid(),
});

export const deleteDocsContentQuerySchema = docsPathQuerySchema.extend({
  job_id: z.string().uuid(),
});

export const downloadPromptSchema = z.object({
  language: z.enum(['en', 'ru']),
  write_mode: z.enum(['overwrite', 'versioned']).default('overwrite'),
  generation_id: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  if (value.write_mode === 'versioned' && !value.generation_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['generation_id'],
      message: 'generation_id is required for versioned docs',
    });
  }
});

export const downloadCodePromptSchema = z.object({
  language: z.enum(['en', 'ru']).default('en'),
});

export const aiJobKindQuerySchema = z.object({
  kind: z.enum(['docs_from_es', 'graph_from_wc']).default('docs_from_es'),
});

export const aiJobProgressSchema = z.object({
  stage: z.string().optional(),
  percent: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
});

export const completeAiJobSchema = z.object({
  status: z.enum(['succeeded', 'failed']),
  summary: z.string().optional(),
  provenance: z.object({
    model_or_agent: z.string().optional(),
  }).optional(),
});
