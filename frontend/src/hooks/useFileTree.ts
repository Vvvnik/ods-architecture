import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export function useFileTree(projectId: string) {
  const queryClient = useQueryClient();

  const invalidateTree = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
  }, [queryClient, projectId]);

  return { projectId, invalidateTree };
}
