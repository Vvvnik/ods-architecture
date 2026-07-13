import '../styles/workspace.css';

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

import { usePanelWidths } from '../hooks/usePanelWidths.js';
import { startColumnResize } from '../utils/startColumnResize.js';

interface WorkspaceLayoutProps {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function WorkspaceLayout({ header, left, center, right }: WorkspaceLayoutProps) {
  const { widths, setTreeWidth, setPropsWidth, min } = usePanelWidths();
  const panelsRef = useRef<HTMLDivElement>(null);

  function startDrag(side: 'left' | 'right', event: ReactPointerEvent<HTMLDivElement>) {
    const containerWidth = panelsRef.current?.clientWidth;
    if (side === 'left') {
      startColumnResize(event, {
        startWidth: widths.tree,
        onWidth: (next) => setTreeWidth(next, containerWidth),
      });
    } else {
      startColumnResize(event, {
        startWidth: widths.props,
        direction: -1,
        onWidth: (next) => setPropsWidth(next, containerWidth),
      });
    }
  }

  return (
    <div className="workspace">
      <div className="workspace-header">{header}</div>
      <div className="workspace-panels" ref={panelsRef}>
        <aside
          className="workspace-left"
          aria-label="Дерево файлов"
          style={{ width: widths.tree, minWidth: min.tree, flex: '0 0 auto' }}
        >
          {left}
        </aside>
        <div
          className="workspace-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={widths.tree}
          aria-label="Изменить ширину дерева"
          onPointerDown={(event) => startDrag('left', event)}
        />
        <section className="workspace-center" aria-label="Просмотр файла" style={{ minWidth: min.main }}>
          {center}
        </section>
        <div
          className="workspace-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={widths.props}
          aria-label="Изменить ширину свойств"
          onPointerDown={(event) => startDrag('right', event)}
        />
        <aside
          className="workspace-right"
          aria-label="Свойства элемента"
          style={{ width: widths.props, minWidth: min.props, flex: '0 0 auto' }}
        >
          {right}
        </aside>
      </div>
    </div>
  );
}
