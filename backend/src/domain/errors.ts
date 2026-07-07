export const ERROR_CODES = [
  'source_unreachable',
  'sync_in_progress',
  'encoding_unsupported',
  'file_not_available',
  'not_found',
  'validation_error',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_MESSAGES_RU: Record<ErrorCode, string> = {
  source_unreachable: 'Источник проекта недоступен',
  sync_in_progress: 'Синхронизация уже выполняется',
  encoding_unsupported: 'Кодировка файла не поддерживается',
  file_not_available: 'Файл недоступен',
  not_found: 'Ресурс не найден',
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
