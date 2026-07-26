import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  downloadDocsPrompt,
  getCurrentAiJob,
  listDocsTree,
  readDocsContent,
  type AiJob,
  type DocsTreeEntry,
} from '../api/docs.js';
import { ApiError } from '../api/client.js';
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

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{messages.DOCS_PAGE_TITLE}</h1>
      <Link to={`/projects/${projectId}`}>{messages.fileTree}</Link>
    </div>
  );

  const left = (
    <ul style={{ listStyle: 'none', margin: 0, padding: 8 }}>
      {files.length === 0 ? (
        <li style={{ color: '#6b7280' }}>{messages.DOCS_TREE_EMPTY}</li>
      ) : (
        files.map((file) => (
          <li key={file.path}>
            <button
              type="button"
              onClick={() => setSelectedPath(file.path)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: selectedPath === file.path ? '#eff6ff' : 'transparent',
                padding: '6px 8px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {file.path}
            </button>
          </li>
        ))
      )}
    </ul>
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
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section>
        <h2 style={{ margin: '0 0 8px', fontSize: 14 }}>{messages.DOCS_PROPERTIES_TITLE}</h2>
        <dl style={{ margin: 0, fontSize: 13 }}>
          <dt>{messages.DOCS_JOB_STATUS}</dt>
          <dd>{job?.status ?? messages.DOCS_JOB_NONE}</dd>
          <dt>{messages.DOCS_ANALYSIS_RUN}</dt>
          <dd style={{ wordBreak: 'break-all' }}>{job?.analysis_run_id ?? '—'}</dd>
          <dt>{messages.DOCS_FILE_COUNT}</dt>
          <dd>{files.length}</dd>
          {job?.summary ? (
            <>
              <dt>{messages.DOCS_JOB_SUMMARY}</dt>
              <dd>{job.summary}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        {messages.DOCS_LANGUAGE}
        <select
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

      {error ? <p style={{ color: '#b91c1c', margin: 0, fontSize: 13 }}>{error}</p> : null}
      {toast ? <p style={{ color: '#047857', margin: 0, fontSize: 13 }}>{toast}</p> : null}
    </div>
  );

  return <WorkspaceLayout header={header} left={left} center={center} right={right} />;
}
