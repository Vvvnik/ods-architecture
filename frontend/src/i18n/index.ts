import type { ElementStatus, SyncStatus } from '../api/models.js';
import { messages as en } from './en.js';
import { messages as ru, type Messages } from './ru.js';

export type Locale = 'en' | 'ru';
export type { Messages };

const catalogs: Record<Locale, Messages> = { en, ru };
let currentLocale: Locale = 'en';

export function setCurrentLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getMessages(locale: Locale = currentLocale): Messages {
  return catalogs[locale];
}

export function syncStatusLabel(status: SyncStatus): string {
  return getMessages().SYNC_STATUS_LABELS[status] ?? status;
}

export function elementStatusLabel(status: ElementStatus): string {
  return getMessages().ELEMENT_STATUS_LABELS[status] ?? status;
}

export function errorMessageForCode(code: string): string {
  const messages = getMessages().ERROR_MESSAGES;
  return messages[code as keyof typeof messages] ?? messages.unknown;
}

export function formatAnalysisProgressHint(run: {
  progress_phase?: string | null;
  progress_active_parser_id?: string | null;
  progress_parsers_completed?: number;
  progress_parsers_total?: number;
}): string {
  const messages = getMessages();
  const completed = run.progress_parsers_completed ?? 0;
  const total = run.progress_parsers_total ?? 0;
  const nm = total > 0 ? `${completed}/${total}` : '';
  if (run.progress_phase === 'ingest') return messages.ANALYSIS_GRAPH_BUILDING;
  if (run.progress_active_parser_id && nm) {
    return `${messages.ANALYSIS_PROGRESS_PREFIX} ${run.progress_active_parser_id} (${nm})`;
  }
  if (nm) return `${messages.ANALYSIS_PROGRESS_PREFIX} ${nm}`;
  return messages.ANALYSIS_RUNNING_HINT;
}

export function graphPageTitle(layer: 'code' | 'system' | 'all'): string {
  const messages = getMessages();
  if (layer === 'code') return messages.GRAPH_PAGE_TITLE_CODE;
  if (layer === 'system') return messages.GRAPH_PAGE_TITLE_SYSTEM;
  return messages.GRAPH_PAGE_TITLE;
}

export function analysisModalShowMorePaths(showMore: number, remaining: number): string {
  return getMessages().ANALYSIS_SHOW_MORE_TEMPLATE
    .replace('{count}', String(showMore))
    .replace('{remaining}', String(remaining));
}

export function analysisParserStatusLabel(
  status: keyof Messages['PARSER_STATUS_LABELS'],
): string {
  return getMessages().PARSER_STATUS_LABELS[status] ?? status;
}

export function graphEdgeTypeLabel(type: string): string {
  const messages = getMessages();
  return (
    messages.EDGE_TYPE_LABELS[type as keyof typeof messages.EDGE_TYPE_LABELS] ??
    messages.SYSTEM_EDGE_TYPE_LABELS[type as keyof typeof messages.SYSTEM_EDGE_TYPE_LABELS] ??
    type
  );
}

export function busParserLabel(parserId: string): string {
  const messages = getMessages();
  if (parserId === 'bus-kafka') return messages.BUS_KAFKA;
  if (parserId === 'bus-rabbit') return messages.BUS_RABBIT;
  return messages.BUS_GENERIC;
}

export function artifactTypeLabel(artifactType: string, parserId?: string | null): string {
  if (artifactType === 'bus' && parserId) return busParserLabel(parserId);
  const labels = getMessages().ARTIFACT_TYPE_LABELS;
  return labels[artifactType as keyof typeof labels] ?? artifactType;
}

export function analysisMessageForRunStatus(
  status: string,
  lastErrorMessage?: string | null,
  parserResults?: Array<{ status: string }>,
  changeSet?: {
    incremental?: boolean;
    added?: string[];
    modified?: string[];
    deleted?: string[];
  },
): string {
  const messages = getMessages();
  const allSkipped =
    parserResults?.length && parserResults.every((result) => result.status === 'skipped');
  const noIncrementalChanges =
    changeSet?.incremental &&
    !changeSet.added?.length &&
    !changeSet.modified?.length &&
    !changeSet.deleted?.length;

  if (status === 'failed') {
    return lastErrorMessage
      ? `${messages.ANALYSIS_FAILED}: ${lastErrorMessage}`
      : messages.ANALYSIS_FAILED;
  }
  if (allSkipped || noIncrementalChanges) return messages.ANALYSIS_NO_CHANGES;
  if (status === 'partial') return messages.ANALYSIS_PARTIAL;
  return messages.ANALYSIS_COMPLETE;
}
