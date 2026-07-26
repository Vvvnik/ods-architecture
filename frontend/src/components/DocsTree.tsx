import { useEffect, useMemo, useState } from 'react';

import type { DocsTreeEntry } from '../api/docs.js';
import { useMessages } from '../i18n/locale.js';

export interface DocsTreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: DocsTreeNode[];
}

interface DocsTreeProps {
  entries: DocsTreeEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function basename(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function compareNodes(a: DocsTreeNode, b: DocsTreeNode): number {
  if (a.type !== b.type) {
    return a.type === 'dir' ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Build a nested folder tree from a flat docs listing. */
export function buildDocsTree(entries: DocsTreeEntry[]): DocsTreeNode[] {
  const root: DocsTreeNode[] = [];
  const byPath = new Map<string, DocsTreeNode>();

  function ensureDir(path: string): DocsTreeNode {
    const existing = byPath.get(path);
    if (existing) {
      if (existing.type !== 'dir') {
        existing.type = 'dir';
      }
      return existing;
    }
    const node: DocsTreeNode = {
      name: basename(path),
      path,
      type: 'dir',
      children: [],
    };
    byPath.set(path, node);
    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    if (!parentPath) {
      root.push(node);
    } else {
      ensureDir(parentPath).children.push(node);
    }
    return node;
  }

  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  for (const entry of sorted) {
    if (entry.type === 'dir') {
      ensureDir(entry.path);
      continue;
    }
    const parentPath = entry.path.includes('/')
      ? entry.path.slice(0, entry.path.lastIndexOf('/'))
      : '';
    const node: DocsTreeNode = {
      name: basename(entry.path),
      path: entry.path,
      type: 'file',
      children: [],
    };
    byPath.set(entry.path, node);
    if (!parentPath) {
      root.push(node);
    } else {
      ensureDir(parentPath).children.push(node);
    }
  }

  const sortRecursive = (nodes: DocsTreeNode[]) => {
    nodes.sort(compareNodes);
    for (const node of nodes) {
      if (node.children.length) sortRecursive(node.children);
    }
  };
  sortRecursive(root);
  return root;
}

function ancestorPaths(filePath: string): string[] {
  const parts = filePath.split('/').filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    result.push(parts.slice(0, i + 1).join('/'));
  }
  return result;
}

interface NodeRowProps {
  node: DocsTreeNode;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function NodeRow({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelect,
}: NodeRowProps) {
  const messages = useMessages();
  const isDirectory = node.type === 'dir';
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  return (
    <li>
      <div
        className={`tree-item${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => {
          if (isDirectory) {
            onToggle(node.path);
          } else {
            onSelect(node.path);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isDirectory) {
              onToggle(node.path);
            } else {
              onSelect(node.path);
            }
          }
        }}
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-expanded={isDirectory ? isExpanded : undefined}
      >
        {isDirectory ? (
          <button
            type="button"
            className="tree-toggle"
            aria-label={isExpanded ? messages.COLLAPSE : messages.EXPAND}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.path);
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="tree-spacer" />
        )}
        <span>{isDirectory ? '📁' : '📄'}</span>
        <span>{node.name}</span>
      </div>
      {isDirectory && isExpanded && node.children.length > 0 ? (
        <ul className="tree-list" role="group">
          {node.children.map((child) => (
            <NodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function DocsTree({ entries, selectedPath, onSelect }: DocsTreeProps) {
  const messages = useMessages();
  const roots = useMemo(() => buildDocsTree(entries), [entries]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selectedPath) return;
    const toOpen = ancestorPaths(selectedPath);
    if (toOpen.length === 0) return;
    setExpandedPaths((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const path of toOpen) {
        if (!next.has(path)) {
          next.add(path);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedPath]);

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

  if (roots.length === 0) {
    return (
      <div className="panel-padding" style={{ color: '#6b7280', fontSize: 13 }}>
        {messages.DOCS_TREE_EMPTY}
      </div>
    );
  }

  return (
    <ul className="tree-list" role="tree" aria-label={messages.DOCS_TREE_ARIA}>
      {roots.map((node) => (
        <NodeRow
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onToggle={handleToggle}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
