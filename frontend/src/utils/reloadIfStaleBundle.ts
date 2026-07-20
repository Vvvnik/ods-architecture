/**
 * After a Docker/SPA rebuild, a tab may keep an old JavaScript bundle in memory
 * because client-side navigation does not reload index.html. Compare script
 * hashes with the current index and force a reload when they differ.
 */
let checkInFlight: Promise<void> | null = null;
let lastCheckAt = 0;
const DEBOUNCE_MS = 2000;

export async function reloadIfStaleBundle(): Promise<void> {
  const now = Date.now();
  if (now - lastCheckAt < DEBOUNCE_MS && checkInFlight) {
    return checkInFlight;
  }
  lastCheckAt = now;

  checkInFlight = (async () => {
    try {
      const response = await fetch(`/?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) return;

      const html = await response.text();
      const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
      if (!match) return;

      const expected = match[1];
      const currentSrc = document
        .querySelector('script[type="module"][src*="assets/index-"]')
        ?.getAttribute('src');
      if (!currentSrc) return;

      const currentPath = currentSrc.startsWith('http')
        ? new URL(currentSrc).pathname
        : currentSrc.startsWith('/')
          ? currentSrc
          : `/${currentSrc}`;

      if (currentPath !== expected) {
        const key = 'ods.staleReload';
        const last = sessionStorage.getItem(key);
        if (last === expected) {
          return;
        }
        sessionStorage.setItem(key, expected);
        location.reload();
      }
    } catch {
      // fail-soft
    } finally {
      checkInFlight = null;
    }
  })();

  return checkInFlight;
}

export function watchStaleBundle(): void {
  void reloadIfStaleBundle();
  const onMaybeVisible = () => {
    if (document.visibilityState === 'visible') {
      void reloadIfStaleBundle();
    }
  };
  document.addEventListener('visibilitychange', onMaybeVisible);
  window.addEventListener('focus', () => {
    void reloadIfStaleBundle();
  });
}
