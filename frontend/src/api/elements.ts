import { apiFetch } from './client.js';
import type { ChildrenPage, Element, ElementStatus, FileContent } from './models.js';

export async function listChildren(
  projectId: string,
  parentPath = '',
  limit = 100,
  offset = 0,
): Promise<ChildrenPage> {
  const params = new URLSearchParams({
    parent_path: parentPath,
    limit: String(limit),
    offset: String(offset),
  });
  const { data } = await apiFetch<ChildrenPage>(
    `/projects/${projectId}/elements?${params.toString()}`,
  );
  return data;
}

export async function getElement(projectId: string, elementId: string): Promise<Element> {
  const { data } = await apiFetch<Element>(`/projects/${projectId}/elements/${elementId}`);
  return data;
}

export async function getFileContent(projectId: string, elementId: string): Promise<FileContent> {
  const { data } = await apiFetch<FileContent>(
    `/projects/${projectId}/elements/${elementId}/content`,
  );
  return data;
}

export async function updateElementStatus(
  projectId: string,
  elementId: string,
  status: ElementStatus,
): Promise<Element> {
  const { data } = await apiFetch<Element>(`/projects/${projectId}/elements/${elementId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data;
}
