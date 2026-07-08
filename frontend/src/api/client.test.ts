import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../i18n/ru.js', () => ({
  errorMessageForCode: (code: string) => code,
}));

import { apiFetch } from './client.js';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not send Content-Type on POST without body (sync endpoint)', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.['Content-Type']).toBeUndefined();
      expect(init?.body).toBeUndefined();

      return new Response(JSON.stringify({ id: 'p1', sync_status: 'running' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/projects/p1/sync', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('sets Content-Type when request has JSON body', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.['Content-Type']).toBe('application/json');

      return new Response(JSON.stringify({ id: 'p1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ source_type: 'local_path', source_value: '/tmp' }),
    });
  });
});
