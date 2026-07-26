import { apiFetch, ApiError } from './client.js';

export interface DocsTreeEntry {
  path: string;
  type: 'file' | 'dir';
}

export interface AiJob {
  id: string;
  project_id: string;
  kind: string;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  analysis_run_id: string;
  docs_language: 'en' | 'ru';
  docs_write_mode: 'overwrite' | 'versioned';
  docs_generation_id: string | null;
  progress: { stage?: string; percent?: number; message?: string } | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
}

export async function listDocsTree(projectId: string): Promise<DocsTreeEntry[]> {
  const { data } = await apiFetch<DocsTreeEntry[]>(`/projects/${projectId}/docs`);
  return data;
}

export async function readDocsContent(
  projectId: string,
  path: string,
): Promise<{ path: string; content: string }> {
  const q = new URLSearchParams({ path });
  const { data } = await apiFetch<{ path: string; content: string }>(
    `/projects/${projectId}/docs/content?${q}`,
  );
  return data;
}

export async function getCurrentAiJob(projectId: string): Promise<AiJob | null> {
  try {
    const { data } = await apiFetch<AiJob>(
      `/projects/${projectId}/ai-jobs/current?kind=docs_from_es`,
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function downloadDocsPrompt(
  projectId: string,
  body: { language: 'en' | 'ru'; write_mode?: 'overwrite' | 'versioned'; generation_id?: string },
): Promise<{ content: string; jobId: string | null }> {
  const response = await fetch(`/api/v1/projects/${projectId}/docs/download-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let code = 'unknown';
    try {
      const err = (await response.json()) as { code?: string };
      code = err.code ?? code;
    } catch {
      /* ignore */
    }
    throw new ApiError(code, code, response.status);
  }
  const content = await response.text();
  return { content, jobId: response.headers.get('X-ODS-AI-Job-Id') };
}
