import { z } from 'zod';

export const graphLocationSchema = z.object({
  start_line: z.number().int().optional(),
  start_col: z.number().int().optional(),
  end_line: z.number().int().optional(),
  end_col: z.number().int().optional(),
});

export const graphNodeSchema = z.object({
  id: z.string(),
  project_id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  parser_id: z.string(),
  kind: z.string(),
  name: z.string(),
  qualified_name: z.string().optional(),
  language: z.string(),
  path: z.string(),
  location: graphLocationSchema.nullable().optional(),
  element_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  signature: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const graphEdgeSchema = z.object({
  id: z.string(),
  project_id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  parser_id: z.string(),
  language: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.string(),
  path: z.string().nullable().optional(),
  location: graphLocationSchema.nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const graphSummarySchema = z.object({
  project_id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  ingest_status: z.enum(['success', 'partial']).optional(),
  node_count: z.number().int(),
  edge_count: z.number().int(),
  languages: z.array(z.string()).optional(),
});

export const graphNodeListSchema = z.object({
  items: z.array(graphNodeSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  analysis_run_id: z.string().uuid().optional(),
});

export const graphEdgeListSchema = z.object({
  items: z.array(graphEdgeSchema),
  analysis_run_id: z.string().uuid().optional(),
});

export const fileGraphResponseSchema = z.object({
  path: z.string(),
  analysis_run_id: z.string().uuid().optional(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

export const listGraphNodesQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  path: z.string().optional(),
  kind: z.string().optional(),
  parent_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const graphSearchQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  q: z.string().trim().min(2),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  // Reserved for future facets — ignored in 007
  filter_status: z.string().optional(),
});

export const listGraphNodeEdgesQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const graphSummaryQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
});

export const fileGraphQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const graphViewQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  focus: z.string().optional(),
  resolve_from: z.string().optional(),
  layer: z.enum(['system', 'code']).optional().default('system'),
  max_nodes: z.coerce.number().int().min(1).max(200).default(200),
  max_edges: z.coerce.number().int().min(1).max(500).default(500),
});

export const graphUiOverviewQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  app: z.string().optional(),
});

export const graphUiScreenQuerySchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  app: z.string().optional(),
  screen: z.string().min(1),
});

export const graphUiNodeSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  qualified_name: z.string().optional(),
  path: z.string().optional(),
  signature: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const graphUiEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const graphUiSliceSchema = z.object({
  project_id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  app_id: z.string().nullable(),
  focus_screen_id: z.string().nullable(),
  empty_reason: z
    .enum(['no_ui_landscape', 'no_screens', 'unknown'])
    .nullable()
    .optional(),
  nodes: z.array(graphUiNodeSchema),
  edges: z.array(graphUiEdgeSchema),
});
