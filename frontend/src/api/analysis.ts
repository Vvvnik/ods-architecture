import { apiFetch } from './client.js';
import type {
  AnalysisRun,
  ChangeSet,
  LanguageReport,
  ParserEnvelope,
  StartAnalysisRunRequest,
} from './analysis-types.js';

export async function getLatestLanguageReport(projectId: string): Promise<LanguageReport> {
  const { data } = await apiFetch<LanguageReport>(
    `/projects/${projectId}/analysis/language-report/latest`,
  );
  return data;
}

export async function getChangeSet(projectId: string): Promise<ChangeSet> {
  const { data } = await apiFetch<ChangeSet>(`/projects/${projectId}/analysis/change-set`);
  return data;
}

export async function startAnalysisRun(
  projectId: string,
  body: StartAnalysisRunRequest,
): Promise<AnalysisRun> {
  const { data } = await apiFetch<AnalysisRun>(`/projects/${projectId}/analysis/runs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data;
}

export async function getAnalysisRun(projectId: string, runId: string): Promise<AnalysisRun> {
  const { data } = await apiFetch<AnalysisRun>(
    `/projects/${projectId}/analysis/runs/${runId}`,
  );
  return data;
}

export async function listParserEnvelopes(
  projectId: string,
  runId: string,
): Promise<ParserEnvelope[]> {
  const { data } = await apiFetch<ParserEnvelope[]>(
    `/projects/${projectId}/analysis/runs/${runId}/envelopes`,
  );
  return data;
}
