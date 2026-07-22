import type { GraphUiEdge, GraphUiNode } from '../../api/graph-types.js';
import { graphEdgeTypeLabel } from '../../i18n/index.js';
import { useMessages } from '../../i18n/locale.js';
import styles from '../../styles/graph-ui.module.css';

export interface GraphUiInspectorProps {
  node: GraphUiNode | null;
  edges: GraphUiEdge[];
  nodes: GraphUiNode[];
  canEnter: boolean;
  onEnter: (nodeId: string) => void;
  onUp?: () => void;
  showUp?: boolean;
}

function peerLabel(nodeId: string, nodesById: Map<string, GraphUiNode>): string {
  return nodesById.get(nodeId)?.name ?? nodeId;
}

function descendantIds(rootId: string, nodes: GraphUiNode[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const list = children.get(node.parent_id) ?? [];
    list.push(node.id);
    children.set(node.parent_id, list);
  }
  const ids = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of children.get(current) ?? []) {
      if (ids.has(child)) continue;
      ids.add(child);
      queue.push(child);
    }
  }
  return ids;
}

function collectApiBinds(
  node: GraphUiNode,
  edges: GraphUiEdge[],
  nodes: GraphUiNode[],
): GraphUiEdge[] {
  const scope =
    node.kind === 'ui_screen' || node.kind === 'ui_component' || node.kind === 'ui_frame'
      ? descendantIds(node.id, nodes)
      : new Set([node.id]);
  return edges.filter(
    (edge) =>
      edge.type === 'invokes_api' && (scope.has(edge.from) || scope.has(edge.to)),
  );
}

export function GraphUiInspector({
  node,
  edges,
  nodes,
  canEnter,
  onEnter,
  onUp,
  showUp = false,
}: GraphUiInspectorProps) {
  const messages = useMessages();
  const {
    GRAPH_UI_API_BINDS,
    GRAPH_UI_API_UNRESOLVED,
    GRAPH_UI_ENTER,
    GRAPH_UI_FLOW_STEPS,
    GRAPH_UI_SOURCE_PATH,
    GRAPH_UI_UP,
    INSPECTOR_ARIA,
    INSPECTOR_NAME,
    INSPECTOR_RELATIONSHIPS,
    INSPECTOR_SELECT_PROMPT,
    INSPECTOR_TYPE,
  } = messages;

  if (!node) {
    return (
      <aside className={styles.inspector} aria-label={INSPECTOR_ARIA}>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          {INSPECTOR_SELECT_PROMPT}
        </p>
        <div className={styles.actions}>
          {showUp && onUp ? (
            <button type="button" name="up-inspector" onClick={onUp}>
              {GRAPH_UI_UP}
            </button>
          ) : null}
          <button type="button" name="enter" disabled aria-disabled="true">
            {GRAPH_UI_ENTER}
          </button>
        </div>
      </aside>
    );
  }

  const nodesById = new Map(nodes.map((entry) => [entry.id, entry]));
  const flowSteps = Array.isArray(node.metadata?.steps)
    ? (node.metadata.steps as unknown[]).filter((step): step is string => typeof step === 'string')
    : [];
  const apiBinds = collectApiBinds(node, edges, nodes);
  const otherRelated = edges
    .filter(
      (edge) =>
        edge.type !== 'invokes_api' &&
        (edge.from === node.id || edge.to === node.id),
    )
    .slice(0, 10);

  return (
    <aside className={styles.inspector} aria-label={INSPECTOR_ARIA}>
      <h3>{node.name}</h3>
      <dl>
        <dt>{INSPECTOR_TYPE}</dt>
        <dd>{node.kind}</dd>
        {node.qualified_name ? (
          <>
            <dt>{INSPECTOR_NAME}</dt>
            <dd>{node.qualified_name}</dd>
          </>
        ) : null}
        {node.path ? (
          <>
            <dt>{GRAPH_UI_SOURCE_PATH}</dt>
            <dd>{node.path}</dd>
          </>
        ) : null}
        {flowSteps.length > 0 ? (
          <>
            <dt>{GRAPH_UI_FLOW_STEPS}</dt>
            <dd>{flowSteps.join(' → ')}</dd>
          </>
        ) : null}
      </dl>

      <dl>
        <dt>{GRAPH_UI_API_BINDS}</dt>
        {apiBinds.length === 0 ? (
          <dd style={{ color: '#6b7280' }}>—</dd>
        ) : (
          apiBinds.map((edge) => {
            const peerId = edge.from === node.id ? edge.to : edge.from;
            const unresolved = edge.metadata?.unresolved_api === true;
            const method = typeof edge.metadata?.http_method === 'string'
              ? edge.metadata.http_method
              : null;
            const pathTemplate = typeof edge.metadata?.path_template === 'string'
              ? edge.metadata.path_template
              : null;
            const label = unresolved && method && pathTemplate
              ? `${method} ${pathTemplate}`
              : peerLabel(peerId, nodesById);
            return (
              <dd key={edge.id} title={graphEdgeTypeLabel(edge.type)}>
                {label}
                {unresolved ? ` (${GRAPH_UI_API_UNRESOLVED})` : ''}
              </dd>
            );
          })
        )}
      </dl>

      {otherRelated.length > 0 ? (
        <dl>
          <dt>{INSPECTOR_RELATIONSHIPS}</dt>
          {otherRelated.map((edge) => {
            const peerId = edge.from === node.id ? edge.to : edge.from;
            const arrow = edge.from === node.id ? '→' : '←';
            return (
              <dd key={edge.id} title={graphEdgeTypeLabel(edge.type)}>
                {node.name}: {arrow} {peerLabel(peerId, nodesById)}
              </dd>
            );
          })}
        </dl>
      ) : null}

      <div className={styles.actions}>
        {showUp && onUp ? (
          <button type="button" name="up-inspector" onClick={onUp}>
            {GRAPH_UI_UP}
          </button>
        ) : null}
        <button
          type="button"
          name="enter"
          className={styles.primary}
          disabled={!canEnter}
          aria-disabled={!canEnter}
          onClick={() => onEnter(node.id)}
        >
          {GRAPH_UI_ENTER}
        </button>
      </div>
    </aside>
  );
}
