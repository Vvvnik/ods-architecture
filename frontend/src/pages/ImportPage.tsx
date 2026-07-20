import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../api/client.js';
import { registerProject } from '../api/projects.js';
import type { SourceType } from '../api/models.js';
import { useSession } from '../context/SessionContext.js';
import { errorMessageForCode } from '../i18n/index.js';
import { useMessages } from '../i18n/locale.js';

export function ImportPage() {
  const messages = useMessages();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActiveProjectId } = useSession();

  const [sourceType, setSourceType] = useState<SourceType>('git_url');
  const [sourceValue, setSourceValue] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: registerProject,
    onSuccess: ({ project }) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      setActiveProjectId(project.id);
      navigate(`/projects/${project.id}`);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(errorMessageForCode('unknown'));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!sourceValue.trim()) {
      setFormError(messages.sourceRequired);
      return;
    }

    mutation.mutate({
      source_type: sourceType,
      source_value: sourceValue.trim(),
      ...(name.trim() ? { name: name.trim() } : {}),
    });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>{messages.importProject}</h2>
      <p style={{ color: '#6b7280' }}>
        {messages.importDescription}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{messages.sourceType}</span>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            {(Object.keys(messages.SOURCE_TYPE_LABELS) as SourceType[]).map((key) => (
              <option key={key} value={key}>
                {messages.SOURCE_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            {sourceType === 'git_url' ? 'Git URL' : messages.localPath}
          </span>
          <input
            type="text"
            value={sourceValue}
            onChange={(e) => setSourceValue(e.target.value)}
            placeholder={
              sourceType === 'git_url'
                ? 'https://github.com/org/repo.git'
                : '/path/to/local/repo'
            }
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </label>

        <label>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            {messages.projectNameOptional}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={messages.projectNamePlaceholder}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </label>

        {formError && (
          <div role="alert" style={{ color: '#dc2626', fontSize: 14 }}>
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          style={{
            padding: '10px 16px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: mutation.isPending ? 'wait' : 'pointer',
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending ? messages.importing : messages.importAction}
        </button>
      </form>
    </div>
  );
}
