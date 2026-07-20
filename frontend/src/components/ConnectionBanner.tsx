import { useQuery } from '@tanstack/react-query';

import { useMessages } from '../i18n/locale.js';
import styles from '../styles/app.module.css';

async function fetchHealth(): Promise<{ status: string }> {
  const response = await fetch('/api/v1/health');
  if (!response.ok) {
    throw new Error('Backend unavailable');
  }
  return response.json() as Promise<{ status: string }>;
}

export function ConnectionBanner() {
  const messages = useMessages();
  const { isError, isFetching, refetch } = useQuery({
    queryKey: ['connection', 'health'],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
    retry: 1,
  });

  if (!isError) {
    return null;
  }

  return (
    <div className={styles.connectionBanner} role="alert">
      <span>{messages.CONNECTION_UNAVAILABLE}</span>
      <button type="button" disabled={isFetching} onClick={() => void refetch()}>
        {isFetching ? messages.CONNECTION_CHECKING : messages.RETRY}
      </button>
    </div>
  );
}
