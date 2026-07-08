import { apiFetch } from './client.js';
import type { Project, RegisterProjectRequest } from './models.js';

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiFetch<Project[]>('/projects');
  return data;
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await apiFetch<Project>(`/projects/${projectId}`);
  return data;
}

export async function registerProject(
  body: RegisterProjectRequest,
): Promise<{ project: Project; created: boolean }> {
  const { data, status } = await apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { project: data, created: status === 201 };
}

export async function syncProject(projectId: string): Promise<Project> {
  const { data } = await apiFetch<Project>(`/projects/${projectId}/sync`, {
    method: 'POST',
  });
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiFetch<void>(`/projects/${projectId}`, { method: 'DELETE' });
}
