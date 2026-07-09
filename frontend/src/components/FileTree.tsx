import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { listChildren } from '../api/elements.js';
import type { Element } from '../api/models.js';
import { elementStatusLabel } from '../i18n/ru.js';

const PAGE_SIZE = 100;

interface FileTreeProps {
  projectId: string;
  selectedElementId: string | null;
  highlightPath?: string | null;
  onSelect: (element: Element) => void;
}

interface FolderBranchProps {
  projectId: string;
  parentPath: string;
  depth: number;
  selectedElementId: string | null;
  onSelect: (element: Element) => void;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}

function FolderBranch({
  projectId,
  parentPath,
  depth,
  selectedElementId,
  onSelect,
  expandedPaths,
  onToggle,
}: FolderBranchProps) {
  const enabled = parentPath === '' || expandedPaths.has(parentPath);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['fileTree', projectId, parentPath],
    queryFn: ({ pageParam = 0 }) => listChildren(projectId, parentPath, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled,
  });

  if (!enabled) {
    return null;
  }

  if (isLoading) {
    return <li className="panel-padding" style={{ color: '#6b7280', fontSize: 13 }}>Загрузка…</li>;
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      {items.map((element) => (
        <TreeNode
          key={element.id}
          element={element}
          depth={depth}
          selectedElementId={selectedElementId}
          onSelect={onSelect}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          projectId={projectId}
        />
      ))}
      {hasNextPage && (
        <li style={{ paddingLeft: depth * 16 + 8 }}>
          <button
            type="button"
            className="load-more-btn"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? 'Загрузка…' : 'Загрузить ещё'}
          </button>
        </li>
      )}
    </>
  );
}

interface TreeNodeProps {
  element: Element;
  depth: number;
  selectedElementId: string | null;
  onSelect: (element: Element) => void;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  projectId: string;
}

function TreeNode({
  element,
  depth,
  selectedElementId,
  onSelect,
  expandedPaths,
  onToggle,
  projectId,
}: TreeNodeProps) {
  const isDirectory = element.type === 'directory';
  const isExpanded = expandedPaths.has(element.path);
  const isSelected = selectedElementId === element.id;

  return (
    <li>
      <div
        className={`tree-item${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => onSelect(element)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(element);
          }
        }}
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
      >
        {isDirectory ? (
          <button
            type="button"
            className="tree-toggle"
            aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(element.path);
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="tree-spacer" />
        )}
        <span>{isDirectory ? '📁' : '📄'}</span>
        <span>{element.path.split('/').pop()}</span>
        <span className="tree-status" title={elementStatusLabel(element.status)}>
          {elementStatusLabel(element.status)}
        </span>
      </div>
      {isDirectory && isExpanded && (
        <ul className="tree-list" role="group">
          <FolderBranch
            projectId={projectId}
            parentPath={element.path}
            depth={depth + 1}
            selectedElementId={selectedElementId}
            onSelect={onSelect}
            expandedPaths={expandedPaths}
            onToggle={onToggle}
          />
        </ul>
      )}
    </li>
  );
}

export function FileTree({ projectId, selectedElementId, highlightPath, onSelect }: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(['']));

  useEffect(() => {
    if (!highlightPath) {
      return;
    }

    const normalized = highlightPath.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalized) {
      return;
    }

    const parts = normalized.split('/');
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.add('');
      for (let i = 0; i < parts.length - 1; i++) {
        next.add(parts.slice(0, i + 1).join('/'));
      }
      return next;
    });
  }, [highlightPath]);

  const handleToggle = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <ul className="tree-list" role="tree" aria-label="Файловая структура">
      <FolderBranch
        projectId={projectId}
        parentPath=""
        depth={0}
        selectedElementId={selectedElementId}
        onSelect={onSelect}
        expandedPaths={expandedPaths}
        onToggle={handleToggle}
      />
    </ul>
  );
}
