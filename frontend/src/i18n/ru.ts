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
