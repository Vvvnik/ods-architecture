import '../styles/workspace.css';

import type { ReactNode } from 'react';

interface WorkspaceLayoutProps {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function WorkspaceLayout({ header, left, center, right }: WorkspaceLayoutProps) {
  return (
    <div className="workspace">
      <div className="workspace-header">{header}</div>
      <div className="workspace-panels">
        <aside className="workspace-left" aria-label="Дерево файлов">
          {left}
        </aside>
        <section className="workspace-center" aria-label="Просмотр файла">
          {center}
        </section>
        <aside className="workspace-right" aria-label="Свойства элемента">
          {right}
        </aside>
      </div>
    </div>
  );
}
