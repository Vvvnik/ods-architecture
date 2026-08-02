import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  downloadDocsCodePrompt,
  downloadDocsPrompt,
  exportDocsPack,
  getCurrentAiJob,
  listDocsTree,
  readDocsContent,
  type AiJob,
  type DocsTreeEntry,
} from '../api/docs.js';
import { ApiError } from '../api/client.js';
import { DocsTree } from '../components/DocsTree.js';
import { useSession } from '../context/SessionContext.js';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout.js';
import { useLocale, useMessages } from '../i18n/locale.js';

function downloadBlob(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBinary(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shortRunId(id: string | undefined | null): string {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export function DocumentationPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { setActiveProjectId } = useSession();
  const messages = useMessages();
  const { locale } = useLocale();

  const [tree, setTree] = useState<DocsTreeEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [docsJob, setDocsJob] = useState<AiJob | null>(null);
  const [codeJob, setCodeJob] = useState<AiJob | null>(null);
  const [docsLanguage, setDocsLanguage] = useState<'en' | 'ru'>(locale === 'ru' ? 'ru' : 'en');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [docsBusy, setDocsBusy] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    if (projectId) setActiveProjectId(projectId);
  }, [projectId, setActiveProjectId]);

  const files = useMemo(() => tree.filter((e) => e.type === 'file'), [tree]);
  const codeDownloadReady = useMemo(
    () => files.some((f) => f.path === 'AGENT-CODE.md') || codeJob != null,
    [files, codeJob],
  );

  const refreshTree = useCallback(async () => {
    if (!projectId) return;
    const entries = await listDocsTree(projectId);
    setTree(entries);
    if (!selectedPath) {
      const agent = entries.find((e) => e.path === 'AGENT-DOC.md');
      if (agent) setSelectedPath(agent.path);
    }
  }, [projectId, selectedPath]);

  const refreshJobs = useCallback(async () => {
    if (!projectId) return;
    const [docs, code] = await Promise.all([
      getCurrentAiJob(projectId, 'docs_from_es'),
      getCurrentAiJob(projectId, 'graph_from_wc'),
    ]);
    setDocsJob(docs);
    setCodeJob(code);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        await refreshTree();
        await refreshJobs();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : messages.DOCS_LOAD_ERROR);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshTree, refreshJobs, messages.DOCS_LOAD_ERROR]);

  useEffect(() => {
    if (!projectId || !selectedPath) {
      setContent('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await readDocsContent(projectId, selectedPath);
        if (!cancelled) setContent(result.content);
      } catch (err) {
        if (!cancelled) {
          setContent('');
          setError(err instanceof ApiError ? err.message : messages.DOCS_LOAD_ERROR);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedPath, messages.DOCS_LOAD_ERROR]);

  const anyJobRunning = docsJob?.status === 'running' || codeJob?.status === 'running';

  useEffect(() => {
    if (!projectId || !anyJobRunning) return;
    const id = window.setInterval(() => {
      void refreshJobs().then(() => refreshTree());
    }, 4000);
    return () => window.clearInterval(id);
  }, [projectId, anyJobRunning, refreshJobs, refreshTree]);

  useEffect(() => {
    if (docsJob?.status === 'succeeded') {
      setToast(messages.DOCS_JOB_SUCCEEDED_TOAST);
    }
  }, [docsJob?.status, docsJob?.id, messages.DOCS_JOB_SUCCEEDED_TOAST]);

  useEffect(() => {
    if (codeJob?.status === 'succeeded') {
      setToast(messages.DOCS_CODE_JOB_SUCCEEDED_TOAST);
    } else if (codeJob?.status === 'failed') {
      setToast(messages.DOCS_CODE_JOB_FAILED_TOAST);
    }
  }, [codeJob?.status, codeJob?.id, messages.DOCS_CODE_JOB_SUCCEEDED_TOAST, messages.DOCS_CODE_JOB_FAILED_TOAST]);

  async function onDownloadPrompt() {
    if (!projectId || docsBusy) return;
    setDocsBusy(true);
    setError(null);
    try {
      const { content: prompt } = await downloadDocsPrompt(projectId, {
        language: docsLanguage,
        write_mode: 'overwrite',
      });
      downloadBlob('AGENT-DOC.md', prompt);
      await refreshJobs();
      await refreshTree();
      setSelectedPath('AGENT-DOC.md');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messages.DOCS_DOWNLOAD_ERROR);
    } finally {
      setDocsBusy(false);
    }
  }

  async function onDownloadCodePrompt() {
    if (!projectId || codeBusy) return;
    setCodeBusy(true);
    setError(null);
    try {
      const { content: prompt } = await downloadDocsCodePrompt(projectId, {
        language: docsLanguage,
      });
      downloadBlob('AGENT-CODE.md', prompt);
      await refreshJobs();
      await refreshTree();
      setSelectedPath('AGENT-CODE.md');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messages.DOCS_DOWNLOAD_CODE_ERROR);
    } finally {
      setCodeBusy(false);
    }
  }

  async function onExport() {
    if (!projectId || docsBusy || codeBusy || docsJob?.status !== 'succeeded') return;
    setDocsBusy(true);
    setError(null);
    try {
      const { blob, filename } = await exportDocsPack(projectId);
      downloadBinary(filename, blob);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messages.DOCS_EXPORT_ERROR);
    } finally {
      setDocsBusy(false);
    }
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{messages.DOCS_PAGE_TITLE}</h1>
      <Link to={`/projects/${projectId}`}>{messages.fileTree}</Link>
    </div>
  );

  const left = (
    <DocsTree
      entries={tree}
      selectedPath={selectedPath}
      onSelect={setSelectedPath}
    />
  );

  const center = (
    <div style={{ padding: 16 }}>
      {selectedPath ? (
        <>
          <div style={{ marginBottom: 8, color: '#6b7280', fontSize: 13 }}>{selectedPath}</div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {content}
          </pre>
        </>
      ) : (
        <p style={{ color: '#6b7280' }}>{messages.DOCS_SELECT_FILE}</p>
      )}
    </div>
  );

  const right = (
    <div className="panel-padding" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>{messages.DOCS_PROPERTIES_TITLE}</h3>
        <table className="properties-table">
          <tbody>
            <tr>
              <th>{messages.DOCS_JOB_STATUS}</th>
              <td>{docsJob?.status ?? messages.DOCS_JOB_NONE}</td>
            </tr>
            <tr>
              <th>{messages.DOCS_ANALYSIS_RUN}</th>
              <td title={docsJob?.analysis_run_id ?? undefined}>
                {shortRunId(docsJob?.analysis_run_id)}
              </td>
            </tr>
            <tr>
              <th>{messages.DOCS_CODE_JOB_STATUS}</th>
              <td data-testid="docs-code-job-status">
                {codeJob?.status ?? messages.DOCS_JOB_NONE}
              </td>
            </tr>
            <tr>
              <th>{messages.DOCS_CODE_ANALYSIS_RUN}</th>
              <td
                data-testid="docs-code-analysis-run"
                title={codeJob?.analysis_run_id ?? undefined}
              >
                {shortRunId(codeJob?.analysis_run_id)}
              </td>
            </tr>
            <tr>
              <th>{messages.DOCS_FILE_COUNT}</th>
              <td>{files.length}</td>
            </tr>
            {docsJob?.summary ? (
              <tr>
                <th>{messages.DOCS_JOB_SUMMARY}</th>
                <td>{docsJob.summary}</td>
              </tr>
            ) : null}
            {codeJob?.summary ? (
              <tr>
                <th>{messages.DOCS_CODE_JOB_SUMMARY}</th>
                <td>{codeJob.summary}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
        {messages.DOCS_LANGUAGE}
        <select
          className="properties-select"
          value={docsLanguage}
          onChange={(e) => setDocsLanguage(e.target.value as 'en' | 'ru')}
        >
          <option value="en">en</option>
          <option value="ru">ru</option>
        </select>
      </label>

      <button type="button" onClick={() => void onDownloadPrompt()} disabled={docsBusy}>
        {docsBusy ? messages.DOCS_DOWNLOAD_BUSY : messages.DOCS_DOWNLOAD_PROMPT}
      </button>

      <button
        type="button"
        onClick={() => void onDownloadCodePrompt()}
        disabled={codeBusy || !codeDownloadReady}
        title={codeDownloadReady ? undefined : messages.DOCS_CODE_DOWNLOAD_DISABLED_HINT}
      >
        {codeBusy ? messages.DOCS_DOWNLOAD_CODE_BUSY : messages.DOCS_DOWNLOAD_CODE_PROMPT}
      </button>

      <button
        type="button"
        onClick={() => void onExport()}
        disabled={docsBusy || codeBusy || docsJob?.status !== 'succeeded'}
        title={
          docsJob?.status === 'succeeded' ? undefined : messages.DOCS_EXPORT_DISABLED_HINT
        }
      >
        {messages.DOCS_EXPORT}
      </button>

      {error ? <p style={{ color: '#b91c1c', margin: 0, fontSize: 14 }}>{error}</p> : null}
      {toast ? <p style={{ color: '#047857', margin: 0, fontSize: 14 }}>{toast}</p> : null}
    </div>
  );

  return <WorkspaceLayout header={header} left={left} center={center} right={right} />;
}
