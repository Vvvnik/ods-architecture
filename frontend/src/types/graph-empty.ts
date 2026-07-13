export type GraphEmptyReason =
  | 'no_project'
  | 'no_analysis'
  | 'empty_graph'
  | 'ingest_failed'
  | 'error';

export interface GraphEmptyState {
  reason: GraphEmptyReason;
  message?: string;
}
