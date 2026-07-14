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

export const ANALYSIS_MODAL_LANGUAGES_TITLE = 'Языки проекта';
export const ANALYSIS_MODAL_CHANGES_TITLE = 'Изменения в коде';
export const ANALYSIS_MODAL_CONTINUE = 'Продолжить';
export const ANALYSIS_MODAL_CANCEL = 'Отмена';
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

export const GRAPH_PAGE_TITLE = 'Граф кода';
export const GRAPH_PAGE_NODES_TITLE = 'Узлы';
export const GRAPH_PAGE_EDGES_TITLE = 'Связи выбранного узла';

export const GRAPH_EMPTY_NO_PROJECT_TITLE = 'Проект не выбран';
export const GRAPH_EMPTY_NO_PROJECT_TEXT =
  'Откройте проект в разделе «Проекты», чтобы просмотреть граф кода.';

export const GRAPH_EMPTY_NO_ANALYSIS_TITLE = 'Граф недоступен';
export const GRAPH_EMPTY_NO_ANALYSIS_TEXT =
  'Сначала выполните синхронизацию и анализ кода.';
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
  'Граф для проекта ещё не построен. Выполните анализ кода.';

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
  return EDGE_TYPE_LABELS[type] ?? type;
}
