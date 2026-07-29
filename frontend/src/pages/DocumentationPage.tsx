import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
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

export function DocumentationPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { setActiveProjectId } = useSession();
  const messages = useMessages();
  const { locale } = useLocale();

  const [tree, setTree] = useState<DocsTreeEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [job, setJob] = useState<AiJob | null>(null);
  const [docsLanguage, setDocsLanguage] = useState<'en' | 'ru'>(locale === 'ru' ? 'ru' : 'en');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) setActiveProjectId(projectId);
  }, [projectId, setActiveProjectId]);

  const files = useMemo(() => tree.filter((e) => e.type === 'file'), [tree]);

  const refreshTree = useCallback(async () => {
    if (!projectId) return;
    const entries = await listDocsTree(projectId);
    setTree(entries);
    if (!selectedPath) {
      const agent = entries.find((e) => e.path === 'AGENT.md');
      if (agent) setSelectedPath(agent.path);
    }
  }, [projectId, selectedPath]);

  const refreshJob = useCallback(async () => {
    if (!projectId) return;
    const current = await getCurrentAiJob(projectId);
    setJob(current);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        await refreshTree();
        await refreshJob();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : messages.DOCS_LOAD_ERROR);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshTree, refreshJob, messages.DOCS_LOAD_ERROR]);

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

  useEffect(() => {
    if (!projectId || job?.status !== 'running') return;
    const id = window.setInterval(() => {
      void refreshJob().then(() => refreshTree());
    }, 4000);
    return () => window.clearInterval(id);
  }, [projectId, job?.status, refreshJob, refreshTree]);

  useEffect(() => {
    if (job?.status === 'succeeded') {
      setToast(messages.DOCS_JOB_SUCCEEDED_TOAST);
    }
  }, [job?.status, job?.id, messages.DOCS_JOB_SUCCEEDED_TOAST]);

  async function onDownloadPrompt() {
    if (!projectId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { content: prompt } = await downloadDocsPrompt(projectId, {
        language: docsLanguage,
        write_mode: 'overwrite',
      });
      downloadBlob('AGENT.md', prompt);
      await refreshJob();
      await refreshTree();
      setSelectedPath('AGENT.md');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messages.DOCS_DOWNLOAD_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    if (!projectId || busy || job?.status !== 'succeeded') return;
    setBusy(true);
    setError(null);
    try {
      const { blob, filename } = await exportDocsPack(projectId);
      downloadBinary(filename, blob);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messages.DOCS_EXPORT_ERROR);
    } finally {
      setBusy(false);
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
              <td>{job?.status ?? messages.DOCS_JOB_NONE}</td>
            </tr>
            <tr>
              <th>{messages.DOCS_ANALYSIS_RUN}</th>
              <td>{job?.analysis_run_id ?? '—'}</td>
            </tr>
            <tr>
              <th>{messages.DOCS_FILE_COUNT}</th>
              <td>{files.length}</td>
            </tr>
            {job?.summary ? (
              <tr>
                <th>{messages.DOCS_JOB_SUMMARY}</th>
                <td>{job.summary}</td>
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

      <button type="button" onClick={() => void onDownloadPrompt()} disabled={busy}>
        {busy ? messages.DOCS_DOWNLOAD_BUSY : messages.DOCS_DOWNLOAD_PROMPT}
      </button>

      <button
        type="button"
        onClick={() => void onExport()}
        disabled={busy || job?.status !== 'succeeded'}
        title={
          job?.status === 'succeeded' ? undefined : messages.DOCS_EXPORT_DISABLED_HINT
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
