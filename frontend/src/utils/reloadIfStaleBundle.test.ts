import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reloadIfStaleBundle } from './reloadIfStaleBundle.js';

describe('reloadIfStaleBundle', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML =
      '<script type="module" src="/assets/index-OLDHASH.js"></script>';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('reloads when index.html points to a different asset hash', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          '<script type="module" crossorigin src="/assets/index-NEWHASH.js"></script>',
      }),
    );

    await reloadIfStaleBundle();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload when hashes match', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          '<script type="module" crossorigin src="/assets/index-OLDHASH.js"></script>',
      }),
    );

    await reloadIfStaleBundle();
    expect(reload).not.toHaveBeenCalled();
  });
});
