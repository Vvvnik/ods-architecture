import { EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getFileContent } from '../api/elements.js';
import type { Element } from '../api/models.js';
import { errorMessageForCode } from '../i18n/ru.js';

interface FileViewerProps {
  projectId: string;
  element: Element | null | undefined;
}

export function FileViewer({ projectId, element }: FileViewerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const isFile = element?.type === 'file';
  const isActive = element?.is_active ?? false;

  const contentQuery = useQuery({
    queryKey: ['fileContent', projectId, element?.id],
    queryFn: () => getFileContent(projectId, element!.id),
    enabled: Boolean(element?.id && isFile && isActive),
    retry: false,
  });

  const textContent =
    contentQuery.data?.kind === 'text' ? (contentQuery.data.content ?? '') : '';

  useEffect(() => {
    if (!editorRef.current || contentQuery.data?.kind !== 'text') {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      return;
    }

    const state = EditorState.create({
      doc: textContent,
      extensions: [
        basicSetup,
        javascript(),
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
      ],
    });

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [textContent, contentQuery.data?.kind]);

  if (!element) {
    return <div className="file-viewer-placeholder">Выберите файл или папку в дереве слева</div>;
  }

  if (element.type === 'directory') {
    return (
      <div className="panel-padding">
        <h3 style={{ marginTop: 0 }}>Папка</h3>
        <p style={{ color: '#374151', wordBreak: 'break-all' }}>{element.path || '/'}</p>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          Выберите файл внутри папки для просмотра содержимого.
        </p>
      </div>
    );
  }

  if (!element.is_active) {
    return (
      <div className="file-viewer-placeholder" role="alert">
        {errorMessageForCode('file_not_available')}
      </div>
    );
  }

  if (contentQuery.isLoading) {
    return <div className="file-viewer-placeholder">Загрузка файла…</div>;
  }

  if (contentQuery.isError) {
    return (
      <div className="file-viewer-placeholder" role="alert">
        {contentQuery.error instanceof Error
          ? contentQuery.error.message
          : errorMessageForCode('unknown')}
      </div>
    );
  }

  const content = contentQuery.data;

  if (!content) {
    return <div className="file-viewer-placeholder">Нет данных о файле</div>;
  }

  if (content.kind === 'not_text') {
    return (
      <div className="file-viewer-placeholder" role="status">
        {errorMessageForCode('not_text')}
      </div>
    );
  }

  if (content.kind === 'error') {
    return (
      <div className="file-viewer-placeholder" role="alert">
        {errorMessageForCode(content.error_code ?? 'unknown')}
      </div>
    );
  }

  return <div className="file-viewer-editor" ref={editorRef} />;
}
