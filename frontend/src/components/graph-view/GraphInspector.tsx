import { Link } from 'react-router-dom';

import type { GraphViewEdge, GraphViewNode } from '../../api/graph-types.js';
import {
  GRAPH_VIEW_CALLS,
  GRAPH_VIEW_ENTER,
  GRAPH_VIEW_ENTER_CODE,
  GRAPH_VIEW_ENDPOINT_SOURCE_CODE,
  GRAPH_VIEW_ENDPOINT_SOURCE_OPENAPI,
  GRAPH_VIEW_OPEN_ANALYSIS,
  GRAPH_VIEW_PUBLISHES,
  graphEdgeTypeLabel,
} from '../../i18n/ru.js';
import styles from '../../styles/graph-view.module.css';
import { displayGraphNodeLabel } from '../../utils/graphNodeLabel.js';

export interface GraphInspectorProps {
  projectId: string;
  node: GraphViewNode | null;
  edges: GraphViewEdge[];
  nodes?: GraphViewNode[];
  /** Current view layer from slice */
  layer: 'system' | 'code';
  onEnter: (nodeId: string) => void;
  /** Enter code layer for a service (keeps same focus id) */
  onEnterCode?: (serviceId: string) => void;
}

function endpointSourceLabel(node: GraphViewNode | undefined): string | null {
  if (!node) {
    return null;
  }
  const source = node.metadata?.source;
  if (source === 'code') {
    return GRAPH_VIEW_ENDPOINT_SOURCE_CODE;
  }
  if (source === 'openapi' || node.parser_id === 'openapi') {
    return GRAPH_VIEW_ENDPOINT_SOURCE_OPENAPI;
  }
  return null;
}

function shortNodeLabel(nodeId: string, node: GraphViewNode | undefined): string {
  return displayGraphNodeLabel(node, nodeId);
}

function resolvePeerLabel(
  edge: GraphViewEdge,
  focusId: string,
  nodesById: Map<string, GraphViewNode>,
): string {
  const peerId = edge.from === focusId ? edge.to : edge.from;
  return shortNodeLabel(peerId, nodesById.get(peerId));
}

function formatRelatedEdgeLine(
  edge: GraphViewEdge,
  focus: GraphViewNode,
  nodesById: Map<string, GraphViewNode>,
): string {
  const focusLabel = shortNodeLabel(focus.id, focus);
  const peerLabel = resolvePeerLabel(edge, focus.id, nodesById);
  const typeLabel = graphEdgeTypeLabel(edge.type);

  // Эндпоинт: «frontend: → HTTP-вызов», без compose-id и без сырого path слева
  if (focus.kind === 'http_endpoint' && (edge.type === 'http_calls' || edge.type === 'exposes')) {
    const arrow = edge.to === focus.id ? '→' : '←';
    return `${peerLabel}: ${arrow} ${typeLabel}`;
  }

  const arrow = edge.from === focus.id ? '→' : '←';
  return `${focusLabel}: ${arrow} ${peerLabel}`;
}

export function GraphInspector({
  projectId,
  node,
  edges,
  nodes = [],
  layer,
  onEnter,
  onEnterCode,
}: GraphInspectorProps) {
  if (!node) {
    return (
      <aside className={styles.inspector} aria-label="Инспектор">
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          Выберите узел на схеме
        </p>
        <div className={styles.actions}>
          <button type="button" disabled aria-disabled="true">
            {GRAPH_VIEW_OPEN_ANALYSIS}
          </button>
        </div>
      </aside>
    );
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const relatedAll = edges.filter((e) => e.from === node.id || e.to === node.id);

  const publishes =
    node.kind === 'service'
      ? edges.filter((e) => e.from === node.id && e.type === 'exposes')
      : [];
  const callsRaw =
    node.kind === 'service'
      ? edges.filter((e) => e.from === node.id && e.type === 'http_calls')
      : [];
  // Several call-sites → same endpoint: show unique peers in inspector
  const calls = (() => {
    const seen = new Set<string>();
    return callsRaw.filter((e) => {
      if (seen.has(e.to)) return false;
      seen.add(e.to);
      return true;
    });
  })();

  const showEnterCode =
    node.kind === 'service' && layer === 'system' && typeof onEnterCode === 'function';

  const endpointSource =
    node.kind === 'http_endpoint' ? endpointSourceLabel(node) : null;

  const otherRelated = relatedAll
    .filter((e) => !(node.kind === 'service' && (e.type === 'exposes' || e.type === 'http_calls')))
    .slice(0, 8);

  return (
    <aside className={styles.inspector} aria-label="Инспектор">
      <h3>{node.name}</h3>
      <dl>
        <dt>Тип</dt>
        <dd>{node.kind}</dd>
        {node.qualified_name ? (
          <>
            <dt>Имя</dt>
            <dd>{node.qualified_name}</dd>
          </>
        ) : null}
        <dt>Роль на схеме</dt>
        <dd>{node.role}</dd>
        {endpointSource ? (
          <>
            <dt>Источник</dt>
            <dd>{endpointSource}</dd>
          </>
        ) : null}
      </dl>

      {node.kind === 'service' ? (
        <>
          <dl>
            <dt>{GRAPH_VIEW_PUBLISHES}</dt>
            {publishes.length === 0 ? (
              <dd style={{ color: '#6b7280' }}>—</dd>
            ) : (
              publishes.map((e) => (
                <dd key={e.id}>{resolvePeerLabel(e, node.id, nodesById)}</dd>
              ))
            )}
          </dl>
          <dl>
            <dt>{GRAPH_VIEW_CALLS}</dt>
            {calls.length === 0 ? (
              <dd style={{ color: '#6b7280' }}>—</dd>
            ) : (
              calls.map((e) => (
                <dd key={e.id}>{resolvePeerLabel(e, node.id, nodesById)}</dd>
              ))
            )}
          </dl>
        </>
      ) : null}

      {otherRelated.length > 0 ? (
        <dl>
          <dt>Связи</dt>
          {otherRelated.map((e) => (
            <dd key={e.id} title={graphEdgeTypeLabel(e.type)}>
              {formatRelatedEdgeLine(e, node, nodesById)}
            </dd>
          ))}
        </dl>
      ) : null}
      <div className={styles.actions}>
        {showEnterCode ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => onEnterCode(node.id)}
          >
            {GRAPH_VIEW_ENTER_CODE}
          </button>
        ) : null}
        <button
          type="button"
          className={showEnterCode ? undefined : styles.primary}
          onClick={() => onEnter(node.id)}
        >
          {GRAPH_VIEW_ENTER}
        </button>
        <Link to={`/projects/${projectId}/graph?select=${encodeURIComponent(node.id)}`}>
          {GRAPH_VIEW_OPEN_ANALYSIS}
        </Link>
      </div>
    </aside>
  );
}
