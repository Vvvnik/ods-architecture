import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client.js';
import { deleteProject } from '../api/projects.js';
import { useSession } from '../context/SessionContext.js';
import { errorMessageForCode } from '../i18n/ru.js';

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProjectId, setActiveProjectId } = useSession();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onMutate: (projectId) => {
      setDeletingProjectId(projectId);
      setDeleteError(null);
    },
    onSuccess: (_data, projectId) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.removeQueries({ queryKey: ['project', projectId] });
      void queryClient.removeQueries({ queryKey: ['fileTree', projectId] });
      void queryClient.removeQueries({ queryKey: ['element', projectId] });
      void queryClient.removeQueries({ queryKey: ['fileContent', projectId] });
      void queryClient.removeQueries({ queryKey: ['fileGraph', projectId] });
      void queryClient.removeQueries({ queryKey: ['analysisRun', projectId] });

      const viewingDeletedProject =
        activeProjectId === projectId || location.pathname === `/projects/${projectId}`;

      if (viewingDeletedProject) {
        setActiveProjectId(null);
        navigate('/projects', { replace: true });
      }

      setDeletingProjectId(null);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setDeleteError(error.message);
      } else {
        setDeleteError(errorMessageForCode('unknown'));
      }
      setDeletingProjectId(null);
    },
  });

  const confirmAndDelete = useCallback(
    (projectId: string, confirmMessage: string) => {
      if (!window.confirm(confirmMessage)) {
        return;
      }
      mutation.mutate(projectId);
    },
    [mutation],
  );

  return {
    confirmAndDelete,
    deleteError,
    clearDeleteError: () => setDeleteError(null),
    deletingProjectId,
    isDeleting: mutation.isPending,
  };
}
