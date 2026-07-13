export const ERROR_CODES = [
  'source_unreachable',
  'sync_in_progress',
  'analysis_in_progress',
  'encoding_unsupported',
  'file_not_available',
  'not_found',
  'language_report_not_found',
  'analysis_run_not_found',
  'graph_not_found',
  'graph_node_not_found',
  'ingest_adapter_missing',
  'cascade_too_large',
  'cascade_failed',
  'validation_error',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_MESSAGES_RU: Record<ErrorCode, string> = {
  source_unreachable: 'Источник проекта недоступен',
  sync_in_progress: 'Синхронизация уже выполняется',
  analysis_in_progress: 'Анализ уже выполняется',
  encoding_unsupported: 'Кодировка файла не поддерживается',
  file_not_available: 'Файл недоступен',
  not_found: 'Ресурс не найден',
  language_report_not_found: 'Отчёт по языкам ещё не создан',
  analysis_run_not_found: 'Прогон анализа не найден',
  graph_not_found: 'Граф проекта ещё не построен. Запустите анализ.',
  graph_node_not_found: 'Узел графа не найден',
  ingest_adapter_missing: 'Адаптер ingest для парсера не найден',
  cascade_too_large:
    'Слишком большая ветка для каскада статуса (больше 5000 элементов). Измените статус точечно или разбейте операцию.',
  cascade_failed: 'Не удалось применить каскад статуса. Статусы не изменены.',
  validation_error: 'Ошибка валидации запроса',
  internal_error: 'Внутренняя ошибка сервера',
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly statusCode: number = 400,
  ) {
    super(message ?? ERROR_MESSAGES_RU[code]);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export function messageForCode(code: ErrorCode): string {
  return ERROR_MESSAGES_RU[code];
}
