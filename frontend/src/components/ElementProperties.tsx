import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { updateElementStatus } from '../api/elements.js';
import type { Element, ElementStatus } from '../api/models.js';
import { ELEMENT_STATUSES } from '../api/models.js';
import { ApiError } from '../api/client.js';
import { ELEMENT_STATUS_LABELS, elementStatusLabel, errorMessageForCode } from '../i18n/ru.js';

interface ElementPropertiesProps {
  projectId: string;
  element: Element | null | undefined;
}

export function ElementProperties({ projectId, element }: ElementPropertiesProps) {
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
        Свойства элемента появятся после выбора в дереве.
      </div>
    );
  }

  const handleStatusChange = (status: ElementStatus) => {
    setError(null);
    mutation.mutate(status);
  };

  return (
    <div className="panel-padding">
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Свойства</h3>
      <table className="properties-table">
        <tbody>
          <tr>
            <th>Путь</th>
            <td>{element.path}</td>
          </tr>
          <tr>
            <th>Тип</th>
            <td>{element.type === 'directory' ? 'Папка' : 'Файл'}</td>
          </tr>
          <tr>
            <th>Статус</th>
            <td>
              <select
                className="properties-select"
                value={element.status}
                disabled={!element.is_active || mutation.isPending}
                onChange={(e) => handleStatusChange(e.target.value as ElementStatus)}
                aria-label="Статус элемента"
              >
                {ELEMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ELEMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                {elementStatusLabel(element.status)}
              </div>
            </td>
          </tr>
          <tr>
            <th>Активен</th>
            <td>{element.is_active ? 'Да' : 'Нет'}</td>
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
