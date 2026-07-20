import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { listGraphNodes } from '../../api/graph.js';
import type { GraphNode } from '../../api/graph-types.js';
import { useMessages } from '../../i18n/locale.js';
import styles from '../../styles/graph.module.css';
import { filterNodesByLayer, type GraphLayerFilter } from '../../utils/graphLayerFilter.js';

interface TreeNodeState {
  node: GraphNode;
  children: TreeNodeState[];
  expanded: boolean;
  loading: boolean;
  serverOffset: number;
  total: number;
}

interface GraphNodeTreeProps {
  projectId: string;
  analysisRunId: string;
  layerFilter?: GraphLayerFilter;
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
    serverOffset: 0,
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
  layerFilter = 'all',
  selectedNodeId,
  onSelect,
  expandPathIds = [],
  focusNodeId = null,
}: GraphNodeTreeProps) {
  const messages = useMessages();
  const [roots, setRoots] = useState<TreeNodeState[]>([]);
  const [loadingRoots, setLoadingRoots] = useState(true);
  const [rootServerOffset, setRootServerOffset] = useState(0);
  const [rootTotal, setRootTotal] = useState(0);

  const fetchPage = useCallback(
    async (parentId: string, startServerOffset: number) => {
      if (layerFilter === 'all') {
        const page = await listGraphNodes(projectId, {
          analysis_run_id: analysisRunId,
          parent_id: parentId,
          limit: PAGE,
          offset: startServerOffset,
        });
        return {
          mapped: page.items.map(toTreeState),
          total: page.total,
          nextServerOffset: startServerOffset + page.items.length,
        };
      }

      const mapped: TreeNodeState[] = [];
      let serverOffset = startServerOffset;
      let total = 0;

      while (mapped.length < PAGE) {
        const page = await listGraphNodes(projectId, {
          analysis_run_id: analysisRunId,
          parent_id: parentId,
          limit: PAGE,
          offset: serverOffset,
        });
        total = page.total;
        if (page.items.length === 0) {
          break;
        }

        mapped.push(...filterNodesByLayer(page.items, layerFilter).map(toTreeState));
        serverOffset += page.items.length;
        if (serverOffset >= total) {
          break;
        }
      }

      return {
        mapped,
        total,
        nextServerOffset: serverOffset,
      };
    },
    [projectId, analysisRunId, layerFilter],
  );

  async function loadUntilFound(
    parentId: string,
    targetId: string,
  ): Promise<{ items: TreeNodeState[]; total: number; serverOffset: number; found?: TreeNodeState }> {
    let items: TreeNodeState[] = [];
    let total = Infinity;
    let serverOffset = 0;

    while (serverOffset < total) {
      const page = await fetchPage(parentId, serverOffset);
      total = page.total;
      items = serverOffset === 0 ? page.mapped : [...items, ...page.mapped];
      serverOffset = page.nextServerOffset;
      const found = items.find((item) => item.node.id === targetId);
      if (found) {
        return { items, total, serverOffset, found };
      }
      if (page.mapped.length === 0) {
        break;
      }
    }

    return { items, total: Number.isFinite(total) ? total : items.length, serverOffset };
  }

  const loadRoots = useCallback(
    async (startServerOffset: number, append: boolean) => {
      setLoadingRoots(true);
      try {
        const page = await fetchPage('root', startServerOffset);
        setRoots((prev) => (append ? [...prev, ...page.mapped] : page.mapped));
        setRootTotal(page.total);
        setRootServerOffset(page.nextServerOffset);
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
        const { items, total, serverOffset, found } = await loadUntilFound(parentId, id);
        if (cancelled) return;

        if (parentId === 'root') {
          workingRoots = items;
          setRoots(items);
          setRootTotal(total);
          setRootServerOffset(serverOffset);
        } else {
          workingRoots = mapTree(workingRoots, parentId, (parent) => ({
            ...parent,
            children: items,
            total,
            serverOffset,
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
    const el = document.querySelector(
      `[data-node-id="${CSS.escape(focusNodeId)}"]`,
    ) as HTMLElement | null;
    if (!el) return;

    // Scroll only inside the tree panel — never scroll the page / edges column.
    const scroller = el.closest('[data-graph-tree-scroll]') as HTMLElement | null;
    if (!scroller) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }

    const sRect = scroller.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const pad = 8;
    if (eRect.top < sRect.top + pad) {
      scroller.scrollTop -= sRect.top + pad - eRect.top;
    } else if (eRect.bottom > sRect.bottom - pad) {
      scroller.scrollTop += eRect.bottom - (sRect.bottom - pad);
    }
  }, [focusNodeId, roots]);

  async function loadChildren(parentId: string, startServerOffset: number, append: boolean) {
    setRoots((prev) =>
      mapTree(prev, parentId, (parent) => ({ ...parent, loading: true })),
    );
    try {
      const page = await fetchPage(parentId, startServerOffset);
      setRoots((prev) =>
        mapTree(prev, parentId, (parent) => ({
          ...parent,
          children: append ? [...parent.children, ...page.mapped] : page.mapped,
          serverOffset: page.nextServerOffset,
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
                    aria-label={item.expanded ? messages.COLLAPSE : messages.EXPAND}
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
                  {item.loading ? <div className={styles.treeLoading}>{messages.LOADING}</div> : null}
                  {renderLevel(item.children, depth + 1)}
                  {item.serverOffset < item.total ? (
                    <button
                      type="button"
                      className={styles.loadMore}
                      disabled={item.loading}
                      onClick={() => void loadChildren(item.node.id, item.serverOffset, true)}
                    >
                      {messages.GRAPH_TREE_MORE}
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
      <div className={styles.treeScroll} data-graph-tree-scroll>
        {loadingRoots && roots.length === 0 ? (
          <div className={styles.treeLoading}>{messages.LOADING}</div>
        ) : null}
        {renderLevel(roots, 0)}
      </div>
      {rootServerOffset < rootTotal ? (
        <div className={styles.treeFooter}>
          <button
            type="button"
            className={styles.loadMore}
            disabled={loadingRoots}
            onClick={() => void loadRoots(rootServerOffset, true)}
          >
            {messages.GRAPH_TREE_MORE_ROOTS}
          </button>
        </div>
      ) : null}
    </div>
  );
}
