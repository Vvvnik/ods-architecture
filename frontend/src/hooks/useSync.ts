import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../api/client.js';
import { getProject, syncProject } from '../api/projects.js';

const POLL_INTERVAL_MS = 2000;

export function useSync(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const [syncError, setSyncError] = useState<string | null>(null);
  const wasRunningRef = useRef(false);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
    refetchInterval: (query) =>
      query.state.data?.sync_status === 'running' ? POLL_INTERVAL_MS : false,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncProject(projectId!),
    onSuccess: (project) => {
      setSyncError(null);
      queryClient.setQueryData(['project', projectId], project);
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.code === 'sync_in_progress') {
          setSyncError(error.message);
          void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          return;
        }
        setSyncError(error.message);
      }
    },
  });

  const isRunning = projectQuery.data?.sync_status === 'running';
  const canSync = Boolean(projectId) && !isRunning && !syncMutation.isPending;
  const isProjectNotFound =
    projectQuery.isError &&
    projectQuery.error instanceof ApiError &&
    projectQuery.error.status === 404;

  useEffect(() => {
    if (isRunning) {
      setSyncError(null);
    }
  }, [isRunning]);

  useEffect(() => {
    if (wasRunningRef.current && !isRunning && projectId) {
      setSyncError(null);
      void queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['element', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['fileContent', projectId] });
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, projectId, queryClient]);

  const triggerSync = () => {
    if (!canSync || !projectId) {
      return;
    }
    setSyncError(null);
    syncMutation.mutate();
  };

  return {
    project: projectQuery.data,
    isLoading: projectQuery.isLoading,
    isRunning,
    canSync,
    syncError,
    triggerSync,
    clearSyncError: () => setSyncError(null),
    isProjectNotFound,
    projectError: projectQuery.error,
  };
}
