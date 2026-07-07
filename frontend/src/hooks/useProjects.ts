import { useQuery } from '@tanstack/react-query';

import { listProjects } from '../api/projects.js';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });
}
