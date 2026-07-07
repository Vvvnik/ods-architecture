import { useQuery } from '@tanstack/react-query';

import styles from '../styles/app.module.css';

async function fetchHealth(): Promise<{ status: string }> {
  const response = await fetch('/api/v1/health');
  if (!response.ok) {
    throw new Error('Backend unavailable');
  }
  return response.json() as Promise<{ status: string }>;
}

export function ConnectionBanner() {
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
      <span>Нет связи с сервером. Проверьте, что backend запущен.</span>
      <button type="button" disabled={isFetching} onClick={() => void refetch()}>
        {isFetching ? 'Проверка…' : 'Повторить'}
      </button>
    </div>
  );
}
