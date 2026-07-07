import type { ApiErrorBody } from './models.js';
import { errorMessageForCode } from '../i18n/ru.js';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; status: number }> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('network_error', errorMessageForCode('network_error'), 0);
  }

  if (response.status === 204) {
    return { data: undefined as T, status: response.status };
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const err = body as ApiErrorBody | null;
    const code = err?.code ?? 'unknown';
    const message = err?.message ?? errorMessageForCode(code);
    throw new ApiError(code, message, response.status);
  }

  return { data: body as T, status: response.status };
}
