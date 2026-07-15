import type { ElementStatus, SyncStatus } from '../api/models.js';

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  idle: 'Ожидание',
  running: 'Синхронизация…',
  success: 'Готово',
  failed: 'Ошибка',
  partial: 'Частично',
};

export const ELEMENT_STATUS_LABELS: Record<ElementStatus, string> = {
  auto_found: 'Найдено автоматически',
  needed: 'Нужен',
  not_needed: 'Не нужен',
  found: 'Найден',
  unused: 'Не используется',
};

export const ERROR_MESSAGES: Record<string, string> = {
  source_unreachable: 'Не удалось получить доступ к источнику. Проверьте URL или путь.',
  sync_in_progress: 'Синхронизация уже выполняется. Дождитесь завершения.',
  project_not_found: 'Проект не найден.',
  element_not_found: 'Элемент не найден в дереве проекта.',
  file_not_available: 'Файл недоступен (возможно, удалён при sync).',
  encoding_unsupported: 'Кодировка файла не поддерживается. Ожидается UTF-8.',
  not_text: 'Файл нельзя отобразить как текст.',
  network_error: 'Нет связи с сервером. Проверьте подключение и повторите.',
  unknown: 'Произошла ошибка. Повторите попытку позже.',
  not_found: 'Ресурс не найден.',
  validation_error: 'Ошибка валидации запроса.',
  analysis_in_progress: 'Анализ уже выполняется',
  language_report_not_found: 'Отчёт по языкам ещё не создан',
  analysis_run_not_found: 'Прогон анализа не найден',
  graph_not_found: 'Граф для проекта ещё не построен',
  graph_node_not_found: 'Узел графа не найден',
};

export function syncStatusLabel(status: SyncStatus): string {
  return SYNC_STATUS_LABELS[status] ?? status;
}

export function elementStatusLabel(status: ElementStatus): string {
  return ELEMENT_STATUS_LABELS[status] ?? status;
}

export function errorMessageForCode(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown;
}

export const SOURCE_TYPE_LABELS = {
  git_url: 'Git URL',
  local_path: 'Локальный путь',
} as const;

export const DELETE_PROJECT_CONFIRM =
  'Удалить проект? Источник можно будет импортировать заново.';

export const ANALYSIS_MODAL_LANGUAGES_TITLE = 'Языки и артефакты проекта';
export const ANALYSIS_MODAL_LANGUAGES_SECTION = 'Языки';
export const ANALYSIS_RUNNING_HINT = 'Анализ…';

/** 010: analysis progress — этап + парсер / N из M */
export function formatAnalysisProgressHint(run: {
  progress_phase?: string | null;
  progress_active_parser_id?: string | null;
  progress_parsers_completed?: number;
  progress_parsers_total?: number;
}): string {
  const completed = run.progress_parsers_completed ?? 0;
  const total = run.progress_parsers_total ?? 0;
  const nm = total > 0 ? `${completed}/${total}` : '';
  if (run.progress_phase === 'ingest') {
    return 'Построение графа…';
  }
  if (run.progress_active_parser_id && nm) {
    return `Анализ: ${run.progress_active_parser_id} (${nm})`;
  }
  if (nm) {
    return `Анализ: ${nm}`;
  }
  return ANALYSIS_RUNNING_HINT;
}

export const GRAPH_PAGE_TITLE = 'Граф анализ';
export const GRAPH_PAGE_TITLE_CODE = 'Граф анализ (код)';
export const GRAPH_PAGE_TITLE_SYSTEM = 'Граф анализ (система)';
export const GRAPH_PAGE_NODES_TITLE = 'Узлы';
export const GRAPH_PAGE_EDGES_TITLE = 'Связи выбранного узла';
export const GRAPH_LAYER_FILTER_PREFIX = 'Слой:';
export const GRAPH_VIEW_PAGE_TITLE = 'Граф просмотр';
export const GRAPH_MENU_ANALYSIS = 'Граф анализ';
export const GRAPH_MENU_VIEW = 'Граф просмотр';
export const GRAPH_VIEW_ENTER = 'Войти';
export const GRAPH_VIEW_TO_SYSTEM = 'К системе';
export const GRAPH_VIEW_UP = 'Наверх';
export const GRAPH_VIEW_OPEN_ANALYSIS = 'В анализе';
export const GRAPH_VIEW_OPEN_VIEW = 'Открыть на схеме';
export const GRAPH_VIEW_EMPTY_SYSTEM =
  'Карта системы пока пуста. Посмотрите узлы в «Граф анализ» или выполните system-анализ.';
export const GRAPH_VIEW_TRUNCATED =
  'Показана только часть участников (лимит схемы). Сузьте фокус или войдите в сервис.';
export const GRAPH_VIEW_RESOLVE_FALLBACK =
  'Узел кода на схеме в MVP не показываем; открыта карта системы.';
export const GRAPH_VIEW_BREADCRUMB_SYSTEM = 'Система';
export const GRAPH_VIEW_LOADING = 'Загрузка схемы…';

export function graphPageTitle(layer: 'code' | 'system' | 'all'): string {
  if (layer === 'code') {
    return GRAPH_PAGE_TITLE_CODE;
  }
  if (layer === 'system') {
    return GRAPH_PAGE_TITLE_SYSTEM;
  }
  return GRAPH_PAGE_TITLE;
}
export const ANALYSIS_MODAL_ARTIFACTS_TITLE = 'Системные артефакты';
export const ANALYSIS_MODAL_CHANGES_TITLE = 'Изменения в коде';
export const ANALYSIS_MODAL_CONTINUE = 'Продолжить';
export const ANALYSIS_MODAL_CANCEL = 'Отмена';
/** showMore = сколько добавить сейчас; remaining = сколько ещё скрыто */
export function ANALYSIS_MODAL_SHOW_MORE_PATHS(showMore: number, remaining: number): string {
  return `Ещё ${showMore} (осталось ${remaining})`;
}
export const ANALYSIS_SECTION_ADDED = 'Добавлены';
export const ANALYSIS_SECTION_MODIFIED = 'Изменены';
export const ANALYSIS_SECTION_DELETED = 'Удалены';
export const ANALYSIS_SECTION_WILL_ANALYZE = 'Будут проанализированы';

const PARSER_STATUS_LABELS = {
  available: 'Парсер доступен',
  missing: 'Парсер не установлен',
  failed: 'Ошибка при прошлом запуске',
} as const;

export function analysisParserStatusLabel(status: keyof typeof PARSER_STATUS_LABELS): string {
  return PARSER_STATUS_LABELS[status] ?? status;
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
  const allSkipped =
    parserResults &&
    parserResults.length > 0 &&
    parserResults.every((result) => result.status === 'skipped');
  const noIncrementalChanges =
    changeSet?.incremental &&
    !changeSet.added?.length &&
    !changeSet.modified?.length &&
    !changeSet.deleted?.length;

  switch (status) {
    case 'success':
      if (allSkipped || noIncrementalChanges) {
        return 'Анализ завершён (изменений в коде нет)';
      }
      return 'Анализ завершён';
    case 'partial':
      if (allSkipped || noIncrementalChanges) {
        return 'Анализ завершён (изменений в коде нет)';
      }
      return 'Анализ завершён частично: часть парсеров недоступна или завершилась с ошибкой';
    case 'failed':
      return lastErrorMessage
        ? `Анализ завершился с ошибкой: ${lastErrorMessage}`
        : 'Анализ завершился с ошибкой';
    default:
      return 'Анализ завершён';
  }
}

export const GRAPH_EMPTY_NO_PROJECT_TITLE = 'Проект не выбран';
export const GRAPH_EMPTY_NO_PROJECT_TEXT =
  'Откройте проект в разделе «Проекты», чтобы просмотреть граф.';

export const GRAPH_EMPTY_NO_ANALYSIS_TITLE = 'Граф недоступен';
export const GRAPH_EMPTY_NO_ANALYSIS_TEXT =
  'Сначала выполните синхронизацию и анализ проекта.';
export const GRAPH_EMPTY_NO_ANALYSIS_ACTION = 'Перейти к проекту';

export const GRAPH_EMPTY_INGEST_FAILED_TITLE = 'Ошибка построения графа';
export const GRAPH_EMPTY_INGEST_FAILED_TEXT =
  'Не удалось преобразовать результаты анализа.';

export const GRAPH_EMPTY_NO_NODES_TITLE = 'Граф пуст';
export const GRAPH_EMPTY_NO_NODES_TEXT =
  'В проекте не найдены символы для отображения.';

export const FILE_GRAPH_PANEL_TITLE = 'Связи файла';
export const FILE_GRAPH_PANEL_NODES_TITLE = 'Символы';
export const FILE_GRAPH_PANEL_EDGES_TITLE = 'Связи';
export const FILE_GRAPH_PANEL_LOADING = 'Загрузка связей…';
export const FILE_GRAPH_PANEL_EMPTY = 'Для этого файла связи не найдены.';
export const FILE_GRAPH_PANEL_NOT_FOUND =
  'Граф для проекта ещё не построен. Выполните анализ.';

/** Канонические типы рёбер code-слоя (006 + 008). Неизвестные → as-is. */
export const EDGE_TYPE_LABELS: Record<string, string> = {
  imports: 'импорт',
  exports: 'экспорт',
  calls: 'вызов',
  inherits: 'наследование',
  implements: 'реализация',
  references: 'ссылка',
  contains: 'содержит',
  injects: 'внедрение (DI)',
};

export function graphEdgeTypeLabel(type: string): string {
  return EDGE_TYPE_LABELS[type] ?? SYSTEM_EDGE_TYPE_LABELS[type] ?? type;
}

export const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  compose: 'Docker Compose',
  appsettings: 'Конфигурация (appsettings)',
  openapi: 'OpenAPI',
  'dotnet-project': '.NET-проекты',
  bus: 'Шина сообщений',
};

export function artifactTypeLabel(artifactType: string, parserId?: string | null): string {
  if (artifactType === 'bus' && parserId) {
    return busParserLabel(parserId);
  }
  return ARTIFACT_TYPE_LABELS[artifactType] ?? artifactType;
}

export function busParserLabel(parserId: string): string {
  if (parserId === 'bus-kafka') {
    return 'Шина (Kafka)';
  }
  if (parserId === 'bus-rabbit') {
    return 'Шина (RabbitMQ)';
  }
  return 'Шина сообщений';
}

/** Канонические типы рёбер system-слоя (009). */
export const SYSTEM_EDGE_TYPE_LABELS: Record<string, string> = {
  depends_on: 'зависимость (сервис)',
  project_reference: 'ссылка на проект',
  exposes: 'публикует API',
  documents: 'описывает (OpenAPI)',
  connects_to: 'подключение к',
  consumes: 'потребляет',
  publishes: 'публикует',
  http_calls: 'HTTP-вызов',
  rpc_handles: 'RPC-обработчик',
};

export const GRAPH_LAYER_FILTER_LABELS: Record<'code' | 'system' | 'all', string> = {
  code: 'Код',
  system: 'Система',
  all: 'Всё',
};
