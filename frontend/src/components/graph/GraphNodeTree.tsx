import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { listGraphNodes } from '../../api/graph.js';
import type { GraphNode } from '../../api/graph-types.js';
import styles from '../../styles/graph.module.css';

interface TreeNodeState {
  node: GraphNode;
  children: TreeNodeState[];
  expanded: boolean;
  loading: boolean;
  offset: number;
  total: number;
}

interface GraphNodeTreeProps {
  projectId: string;
  analysisRunId: string;
  selectedNodeId: string | null;
  onSelect: (node: GraphNode) => void;
  expandPathIds?: string[];
  focusNodeId?: string | null;
}

const PAGE = 50;

function toTreeState(node: GraphNode): TreeNodeState {
  return {
    node,
    children: [],
    expanded: false,
    loading: false,
    offset: 0,
    total: 0,
  };
}

function mapTree(
  level: TreeNodeState[],
  targetId: string,
  mapper: (node: TreeNodeState) => TreeNodeState,
): TreeNodeState[] {
  return level.map((item) => {
    if (item.node.id === targetId) {
      return mapper(item);
    }
    if (item.children.length === 0) {
      return item;
    }
    return { ...item, children: mapTree(item.children, targetId, mapper) };
  });
}

export function GraphNodeTree({
  projectId,
  analysisRunId,
  selectedNodeId,
  onSelect,
  expandPathIds = [],
  focusNodeId = null,
}: GraphNodeTreeProps) {
  const [roots, setRoots] = useState<TreeNodeState[]>([]);
  const [loadingRoots, setLoadingRoots] = useState(true);
  const [rootOffset, setRootOffset] = useState(0);
  const [rootTotal, setRootTotal] = useState(0);

  const fetchPage = useCallback(
    async (parentId: string, offset: number) => {
      const page = await listGraphNodes(projectId, {
        analysis_run_id: analysisRunId,
        parent_id: parentId,
        limit: PAGE,
        offset,
      });
      return { mapped: page.items.map(toTreeState), total: page.total };
    },
    [projectId, analysisRunId],
  );

  async function loadUntilFound(
    parentId: string,
    targetId: string,
  ): Promise<{ items: TreeNodeState[]; total: number; found?: TreeNodeState }> {
    let items: TreeNodeState[] = [];
    let total = Infinity;
    let offset = 0;
    while (items.length < total) {
      const page = await fetchPage(parentId, offset);
      total = page.total;
      items = offset === 0 ? page.mapped : [...items, ...page.mapped];
      offset = items.length;
      const found = items.find((item) => item.node.id === targetId);
      if (found) {
        return { items, total, found };
      }
      if (page.mapped.length === 0) break;
    }
    return { items, total: Number.isFinite(total) ? total : items.length };
  }

  const loadRoots = useCallback(
    async (offset: number, append: boolean) => {
      setLoadingRoots(true);
      try {
        const page = await fetchPage('root', offset);
        setRoots((prev) => (append ? [...prev, ...page.mapped] : page.mapped));
        setRootTotal(page.total);
        setRootOffset(offset);
      } finally {
        setLoadingRoots(false);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    void loadRoots(0, false);
  }, [loadRoots]);

  useEffect(() => {
    if (expandPathIds.length === 0) return;
    let cancelled = false;

    void (async () => {
      let workingRoots: TreeNodeState[] = [];
      let parentId = 'root';

      for (let i = 0; i < expandPathIds.length; i++) {
        const id = expandPathIds[i]!;
        const { items, total, found } = await loadUntilFound(parentId, id);
        if (cancelled) return;

        if (parentId === 'root') {
          workingRoots = items;
          setRoots(items);
          setRootTotal(total);
          setRootOffset(Math.max(0, items.length - PAGE));
        } else {
          workingRoots = mapTree(workingRoots, parentId, (parent) => ({
            ...parent,
            children: items,
            total,
            offset: Math.max(0, items.length - PAGE),
            expanded: true,
            loading: false,
          }));
          setRoots(workingRoots);
        }

        if (!found) break;

        if (i < expandPathIds.length - 1) {
          parentId = found.node.id;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandPathIds.join('|'), fetchPage]);

  useEffect(() => {
    if (!focusNodeId) return;
    const el = document.querySelector(`[data-node-id="${CSS.escape(focusNodeId)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusNodeId, roots]);

  async function loadChildren(parentId: string, offset: number, append: boolean) {
    setRoots((prev) =>
      mapTree(prev, parentId, (parent) => ({ ...parent, loading: true })),
    );
    try {
      const page = await fetchPage(parentId, offset);
      setRoots((prev) =>
        mapTree(prev, parentId, (parent) => ({
          ...parent,
          children: append ? [...parent.children, ...page.mapped] : page.mapped,
          offset,
          total: page.total,
          loading: false,
          expanded: true,
        })),
      );
    } catch {
      setRoots((prev) =>
        mapTree(prev, parentId, (parent) => ({ ...parent, loading: false })),
      );
    }
  }

  async function toggle(nodeId: string, currentlyExpanded: boolean, hasLoadedChildren: boolean) {
    if (currentlyExpanded) {
      setRoots((prev) =>
        mapTree(prev, nodeId, (parent) => ({ ...parent, expanded: false })),
      );
      return;
    }
    if (!hasLoadedChildren) {
      await loadChildren(nodeId, 0, false);
      return;
    }
    setRoots((prev) =>
      mapTree(prev, nodeId, (parent) => ({ ...parent, expanded: true })),
    );
  }

  function renderLevel(level: TreeNodeState[], depth: number): ReactNode {
    return (
      <ul className={styles.treeList} style={{ paddingLeft: depth === 0 ? 0 : 16 }}>
        {level.map((item) => {
          const selected = item.node.id === selectedNodeId;
          const focused = item.node.id === focusNodeId;
          return (
            <li key={item.node.id}>
              <div
                className={`${styles.treeRow} ${selected ? styles.treeRowSelected : ''} ${
                  focused ? styles.treeRowFocused : ''
                }`}
                data-node-id={item.node.id}
              >
                {item.node.has_children ? (
                  <button
                    type="button"
                    className={styles.treeToggle}
                    aria-label={item.expanded ? 'Свернуть' : 'Развернуть'}
                    onClick={() =>
                      void toggle(item.node.id, item.expanded, item.children.length > 0)
                    }
                  >
                    {item.expanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className={styles.treeSpacer} />
                )}
                <button
                  type="button"
                  className={styles.treeLabel}
                  onClick={() => onSelect(item.node)}
                >
                  <span className={styles.treeName}>{item.node.name}</span>
                  <span className={styles.treeKind}>{item.node.kind}</span>
                </button>
              </div>
              {item.expanded ? (
                <>
                  {item.loading ? <div className={styles.treeLoading}>Загрузка…</div> : null}
                  {renderLevel(item.children, depth + 1)}
                  {item.children.length < item.total ? (
                    <button
                      type="button"
                      className={styles.loadMore}
                      disabled={item.loading}
                      onClick={() => void loadChildren(item.node.id, item.offset + PAGE, true)}
                    >
                      Ещё…
                    </button>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={styles.treeRoot}>
      {loadingRoots && roots.length === 0 ? (
        <div className={styles.treeLoading}>Загрузка…</div>
      ) : null}
      {renderLevel(roots, 0)}
      {roots.length < rootTotal ? (
        <button
          type="button"
          className={styles.loadMore}
          disabled={loadingRoots}
          onClick={() => void loadRoots(rootOffset + PAGE, true)}
        >
          Ещё корневые…
        </button>
      ) : null}
    </div>
  );
}
