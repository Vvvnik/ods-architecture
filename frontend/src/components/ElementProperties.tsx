import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { updateElementStatus } from '../api/elements.js';
import type { Element, ElementStatus } from '../api/models.js';
import { ELEMENT_STATUSES } from '../api/models.js';
import { ApiError } from '../api/client.js';
import { elementStatusLabel, errorMessageForCode } from '../i18n/index.js';
import { useMessages } from '../i18n/locale.js';

interface ElementPropertiesProps {
  projectId: string;
  element: Element | null | undefined;
}

export function ElementProperties({ projectId, element }: ElementPropertiesProps) {
  const messages = useMessages();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (status: ElementStatus) => updateElementStatus(projectId, element!.id, status),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: ['element', projectId, element?.id] });
      const previous = queryClient.getQueryData<Element>(['element', projectId, element?.id]);
      if (previous) {
        queryClient.setQueryData<Element>(['element', projectId, element?.id], {
          ...previous,
          status,
        });
      }
      return { previous };
    },
    onError: (err, _status, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['element', projectId, element?.id], context.previous);
      }
      setError(
        err instanceof ApiError ? err.message : errorMessageForCode('unknown'),
      );
    },
    onSuccess: (updated) => {
      setError(null);
      queryClient.setQueryData(['element', projectId, updated.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
    },
  });

  if (!element) {
    return (
      <div className="panel-padding" style={{ color: '#6b7280', fontSize: 14 }}>
        {messages.ELEMENT_PROPERTIES_PROMPT}
      </div>
    );
  }

  const handleStatusChange = (status: ElementStatus) => {
    setError(null);
    mutation.mutate(status);
  };

  return (
    <div className="panel-padding">
      <h3 style={{ marginTop: 0, fontSize: 16 }}>{messages.ELEMENT_PROPERTIES_TITLE}</h3>
      <table className="properties-table">
        <tbody>
          <tr>
            <th>{messages.ELEMENT_PATH}</th>
            <td>{element.path}</td>
          </tr>
          <tr>
            <th>{messages.ELEMENT_TYPE}</th>
            <td>{element.type === 'directory' ? messages.ELEMENT_DIRECTORY : messages.ELEMENT_FILE}</td>
          </tr>
          <tr>
            <th>{messages.ELEMENT_STATUS}</th>
            <td>
              <select
                className="properties-select"
                value={element.status}
                disabled={!element.is_active || mutation.isPending}
                onChange={(e) => handleStatusChange(e.target.value as ElementStatus)}
                aria-label={messages.ELEMENT_STATUS_ARIA}
              >
                {ELEMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {messages.ELEMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                {elementStatusLabel(element.status)}
              </div>
            </td>
          </tr>
          <tr>
            <th>{messages.ELEMENT_ACTIVE}</th>
            <td>{element.is_active ? messages.YES : messages.NO}</td>
          </tr>
        </tbody>
      </table>
      {error && (
        <div className="sync-alert" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
