import type { EdgeType } from '../../../domain/graph-edge.js';
import type { NodeKind } from '../../../domain/graph-node.js';
import {
  composeServiceNodeId,
} from '../system-layer.js';
import { inferComposeFile } from '../api-routes-ids.js';
import type { GraphEdgeInput, GraphNodeInput, IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { apiHintNodeId, uiEdgeId, uiNodeId, withUiLayer } from '../ui-layer.js';

interface NativeLocation {
  start_line?: number;
  start_col?: number;
  end_line?: number;
  end_col?: number;
}

interface NativeApiCall {
  method: string;
  path_template: string;
  body_fields?: string[];
  resolved_endpoint_hint?: string;
}

interface NativeNavigation {
  to_route_key: string;
  via?: string;
}

interface NativeControl {
  stable_key: string;
  control_kind: string;
  name?: string;
  label_key?: string;
  label_default?: string;
  field_name?: string;
  api_calls?: NativeApiCall[];
  opens_flow_key?: string;
  navigates_to_route_key?: string;
  location?: NativeLocation;
  source_path?: string;
}

interface NativeComponent {
  stable_key: string;
  name: string;
  kind_hint?: string;
  source_path?: string;
  location?: NativeLocation;
  controls?: NativeControl[];
  style_keys?: string[];
  surfaces?: NativeSurface[];
}

interface NativeFrame {
  stable_key: string;
  role: string;
  name?: string;
}

interface NativeScreen {
  stable_key: string;
  name: string;
  component_name?: string;
  source_path?: string;
  location?: NativeLocation;
  frames?: NativeFrame[];
  components?: NativeComponent[];
  query_params?: string[];
  style_keys?: string[];
  navigations?: NativeNavigation[];
  surfaces?: NativeSurface[];
  api_calls?: NativeApiCall[];
}

interface NativeRoute {
  stable_key: string;
  path_pattern: string;
  module_key?: string;
  screen?: NativeScreen;
  location?: NativeLocation;
  source_path?: string;
}

interface NativeModule {
  stable_key: string;
  name: string;
  path?: string;
}

interface NativeStyle {
  stable_key: string;
  path: string;
  kind?: string;
  class_names?: string[];
}

interface NativeFlow {
  stable_key: string;
  name: string;
  steps?: string[];
  source_path?: string;
  api_calls?: NativeApiCall[];
}

interface NativeSurface {
  stable_key: string;
  surface_kind: string;
  library?: string;
}

interface NativeApp {
  stable_key: string;
  name: string;
  framework?: string;
  language?: string;
  entry_path?: string;
  modules?: NativeModule[];
  routes?: NativeRoute[];
  styles?: NativeStyle[];
  flows?: NativeFlow[];
  surfaces?: NativeSurface[];
  /** Optional method+path → http_endpoint id map for joined invokes_api. */
  endpoint_lookup?: Record<string, string>;
  /** Optional service id override for binds_service. */
  binds_service_id?: string;
}

interface NativeUiTree {
  apps?: NativeApp[];
  /** Top-level optional endpoint lookup shared across apps. */
  endpoint_lookup?: Record<string, string>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeApps(model: unknown): { apps: NativeApp[]; endpointLookup: Record<string, string> } {
  const root = asRecord(model);
  if (!root) {
    return { apps: [], endpointLookup: {} };
  }
  const endpointLookup =
    root.endpoint_lookup && typeof root.endpoint_lookup === 'object'
      ? (root.endpoint_lookup as Record<string, string>)
      : {};
  const appsRaw = root.apps;
  if (!Array.isArray(appsRaw)) {
    return { apps: [], endpointLookup };
  }
  const apps = appsRaw.filter(
    (entry): entry is NativeApp =>
      Boolean(entry && typeof entry === 'object' && (entry as NativeApp).stable_key && (entry as NativeApp).name),
  );
  return { apps, endpointLookup };
}

function pushNode(
  nodes: GraphNodeInput[],
  ctx: IngestContext,
  options: {
    kind: NodeKind;
    stableKey: string;
    name: string;
    path: string;
    parentId?: string | null;
    language?: string;
    qualifiedName?: string;
    signature?: string | null;
    location?: NativeLocation | null;
    metadata?: Record<string, unknown>;
  },
): string {
  const id = uiNodeId(ctx.parser_id, options.kind, options.stableKey);
  nodes.push({
    id,
    project_id: ctx.project_id,
    analysis_run_id: ctx.analysis_run_id,
    parser_id: ctx.parser_id,
    kind: options.kind,
    name: options.name,
    qualified_name: options.qualifiedName ?? options.name,
    language: options.language ?? 'typescript',
    path: options.path,
    parent_id: options.parentId ?? null,
    signature: options.signature ?? null,
    location: options.location ?? null,
    metadata: withUiLayer(options.metadata),
  });
  return id;
}

function pushEdge(
  edges: GraphEdgeInput[],
  ctx: IngestContext,
  type: EdgeType,
  from: string,
  to: string,
  path: string | null,
  metadata?: Record<string, unknown>,
): void {
  edges.push({
    id: uiEdgeId(ctx.parser_id, type, from, to),
    project_id: ctx.project_id,
    analysis_run_id: ctx.analysis_run_id,
    parser_id: ctx.parser_id,
    language: 'ui',
    from,
    to,
    type,
    path,
    metadata: withUiLayer(metadata),
  });
}

function lookupKey(method: string, pathTemplate: string): string {
  return `${method.toUpperCase()}:${pathTemplate}`;
}

function resolveEndpointTarget(
  call: NativeApiCall,
  lookups: Record<string, string>[],
): { targetId: string; unresolved: boolean } {
  if (call.resolved_endpoint_hint?.trim()) {
    return { targetId: call.resolved_endpoint_hint.trim(), unresolved: false };
  }
  const key = lookupKey(call.method, call.path_template);
  for (const lookup of lookups) {
    const hit = lookup[key] ?? lookup[key.toLowerCase()];
    if (hit) {
      return { targetId: hit, unresolved: false };
    }
  }
  return {
    targetId: apiHintNodeId('react-ui', call.method, call.path_template),
    unresolved: true,
  };
}

function emitApiCalls(
  nodes: GraphNodeInput[],
  edges: GraphEdgeInput[],
  ctx: IngestContext,
  fromId: string,
  sourcePath: string,
  calls: NativeApiCall[] | undefined,
  lookups: Record<string, string>[],
): void {
  for (const call of calls ?? []) {
    const method = String(call.method).toUpperCase();
    const pathTemplate = String(call.path_template);
    const resolved = resolveEndpointTarget(call, lookups);
    if (resolved.unresolved && !nodes.some((node) => node.id === resolved.targetId)) {
      nodes.push({
        id: resolved.targetId,
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        // Hint target — not http_endpoint (data-model unresolved API).
        kind: 'ui_control',
        name: `${method} ${pathTemplate}`,
        qualified_name: resolved.targetId,
        language: 'ui',
        path: sourcePath,
        parent_id: null,
        signature: `${method} ${pathTemplate}`,
        metadata: withUiLayer({
          unresolved_api: true,
          http_method: method,
          path_template: pathTemplate,
          body_fields: call.body_fields ?? [],
          hint: true,
          api_hint: true,
        }),
      });
    }
    pushEdge(edges, ctx, 'invokes_api', fromId, resolved.targetId, sourcePath, {
      unresolved_api: resolved.unresolved,
      http_method: method,
      path_template: pathTemplate,
      body_fields: call.body_fields ?? [],
    });
  }
}

/**
 * Heuristic (research R9): link ui_app → compose service by package/path name.
 * Dogfood: frontend/ → compose:service:…#frontend
 */
export function resolveBindsServiceTarget(app: NativeApp): string | null {
  if (app.binds_service_id?.trim()) {
    return app.binds_service_id.trim();
  }
  const entryPath = (app.entry_path ?? app.stable_key ?? '').replace(/\\/g, '/');
  const nameHint = (app.name ?? '').toLowerCase();
  const keyHint = app.stable_key.toLowerCase();

  const candidates = new Set<string>();
  if (keyHint) {
    candidates.add(keyHint);
  }
  for (const part of entryPath.split('/').filter(Boolean)) {
    const lower = part.toLowerCase();
    if (['src', 'app', 'apps', 'packages', 'dist', 'node_modules'].includes(lower)) {
      continue;
    }
    if (part.includes('.')) {
      continue;
    }
    candidates.add(lower);
  }
  if (nameHint.includes('frontend')) {
    candidates.add('frontend');
  }
  if (keyHint.includes('frontend') || entryPath.includes('/frontend/') || entryPath.startsWith('frontend/')) {
    candidates.add('frontend');
  }

  const serviceName =
    [...candidates].find((c) => c === 'frontend') ??
    [...candidates].find((c) => c === 'ui' || c === 'web' || c === 'client') ??
    [...candidates][0];
  if (!serviceName) {
    return null;
  }
  const composeFile = inferComposeFile(entryPath || `${serviceName}/`);
  return composeServiceNodeId(serviceName, composeFile);
}

function transformApp(
  app: NativeApp,
  ctx: IngestContext,
  rootLookup: Record<string, string>,
): IngestTransformResult {
  const nodes: GraphNodeInput[] = [];
  const edges: GraphEdgeInput[] = [];
  const path = app.entry_path ?? `${app.stable_key}/`;
  const language = app.language ?? 'typescript';
  const lookups = [
    rootLookup,
    ...(app.endpoint_lookup && typeof app.endpoint_lookup === 'object' ? [app.endpoint_lookup] : []),
  ];

  const appId = pushNode(nodes, ctx, {
    kind: 'ui_app',
    stableKey: app.stable_key,
    name: app.name,
    path,
    language,
    metadata: { framework: app.framework ?? 'unknown' },
  });

  const moduleIds = new Map<string, string>();
  for (const mod of app.modules ?? []) {
    const moduleId = pushNode(nodes, ctx, {
      kind: 'ui_module',
      stableKey: `${app.stable_key}/${mod.stable_key}`,
      name: mod.name,
      path: mod.path ?? path,
      parentId: appId,
      language,
    });
    moduleIds.set(mod.stable_key, moduleId);
    pushEdge(edges, ctx, 'contains', appId, moduleId, mod.path ?? path);
  }

  const styleIds = new Map<string, string>();
  for (const style of app.styles ?? []) {
    const styleId = pushNode(nodes, ctx, {
      kind: 'ui_style',
      stableKey: `${app.stable_key}/${style.stable_key}`,
      name: style.stable_key,
      path: style.path,
      parentId: appId,
      language: 'css',
      signature: style.kind ?? null,
      metadata: { style_kind: style.kind, class_names: style.class_names ?? [] },
    });
    styleIds.set(style.stable_key, styleId);
    pushEdge(edges, ctx, 'contains', appId, styleId, style.path);
  }

  const flowIds = new Map<string, string>();
  for (const flow of app.flows ?? []) {
    const flowPath = flow.source_path ?? path;
    const flowId = pushNode(nodes, ctx, {
      kind: 'ui_flow',
      stableKey: `${app.stable_key}/${flow.stable_key}`,
      name: flow.name,
      path: flowPath,
      parentId: appId,
      language,
      metadata: { steps: flow.steps ?? [] },
    });
    flowIds.set(flow.stable_key, flowId);
    pushEdge(edges, ctx, 'contains', appId, flowId, flowPath);
    emitApiCalls(nodes, edges, ctx, flowId, flowPath, flow.api_calls, lookups);
  }

  for (const surface of app.surfaces ?? []) {
    const surfaceId = pushNode(nodes, ctx, {
      kind: 'ui_surface',
      stableKey: `${app.stable_key}/${surface.stable_key}`,
      name: surface.surface_kind,
      path,
      parentId: appId,
      language,
      signature: surface.library ?? surface.surface_kind,
      metadata: { surface_kind: surface.surface_kind, library: surface.library },
    });
    pushEdge(edges, ctx, 'contains', appId, surfaceId, path);
  }

  const routeIds = new Map<string, string>();
  const screenIds = new Map<string, string>();

  for (const route of app.routes ?? []) {
    const routePath = route.source_path ?? path;
    const parentId = route.module_key ? (moduleIds.get(route.module_key) ?? appId) : appId;
    const routeId = pushNode(nodes, ctx, {
      kind: 'ui_route',
      stableKey: `${app.stable_key}/${route.stable_key}`,
      name: route.path_pattern,
      path: routePath,
      parentId,
      language,
      qualifiedName: route.path_pattern,
      signature: route.path_pattern,
      location: route.location ?? null,
      metadata: { path_pattern: route.path_pattern },
    });
    routeIds.set(route.stable_key, routeId);
    pushEdge(edges, ctx, 'contains', parentId, routeId, routePath);

    const screen = route.screen;
    if (!screen) {
      continue;
    }
    const screenPath = screen.source_path ?? routePath;
    const screenId = pushNode(nodes, ctx, {
      kind: 'ui_screen',
      stableKey: `${app.stable_key}/${screen.stable_key}`,
      name: screen.name,
      path: screenPath,
      parentId: routeId,
      language,
      location: screen.location ?? null,
      signature: screen.component_name ?? null,
      metadata: {
        component_name: screen.component_name,
        query_params: screen.query_params ?? [],
      },
    });
    screenIds.set(screen.stable_key, screenId);
    pushEdge(edges, ctx, 'contains', routeId, screenId, screenPath);

    for (const styleKey of screen.style_keys ?? []) {
      const styleId = styleIds.get(styleKey);
      if (styleId) {
        pushEdge(edges, ctx, 'uses_style', screenId, styleId, screenPath);
      }
    }

    for (const nav of screen.navigations ?? []) {
      const toRouteId = routeIds.get(nav.to_route_key);
      // Route may appear later; resolve in second pass below.
      if (toRouteId) {
        pushEdge(edges, ctx, 'navigates_to', screenId, toRouteId, screenPath, {
          via: nav.via,
        });
      }
    }

    for (const frame of screen.frames ?? []) {
      const frameId = pushNode(nodes, ctx, {
        kind: 'ui_frame',
        stableKey: `${app.stable_key}/${screen.stable_key}/${frame.stable_key}`,
        name: frame.name ?? frame.role,
        path: screenPath,
        parentId: screenId,
        language,
        signature: frame.role,
        metadata: { role: frame.role },
      });
      pushEdge(edges, ctx, 'contains', screenId, frameId, screenPath);
    }

    for (const surface of screen.surfaces ?? []) {
      const surfaceId = pushNode(nodes, ctx, {
        kind: 'ui_surface',
        stableKey: `${app.stable_key}/${screen.stable_key}/${surface.stable_key}`,
        name: surface.surface_kind,
        path: screenPath,
        parentId: screenId,
        language,
        signature: surface.library ?? surface.surface_kind,
        metadata: { surface_kind: surface.surface_kind, library: surface.library },
      });
      pushEdge(edges, ctx, 'contains', screenId, surfaceId, screenPath);
    }

    emitApiCalls(nodes, edges, ctx, screenId, screenPath, screen.api_calls, lookups);

    for (const component of screen.components ?? []) {
      const componentPath = component.source_path ?? screenPath;
      const componentId = pushNode(nodes, ctx, {
        kind: 'ui_component',
        stableKey: `${app.stable_key}/${screen.stable_key}/${component.stable_key}`,
        name: component.name,
        path: componentPath,
        parentId: screenId,
        language,
        location: component.location ?? null,
        signature: component.kind_hint ?? null,
        metadata: { kind_hint: component.kind_hint },
      });
      pushEdge(edges, ctx, 'contains', screenId, componentId, componentPath);

      for (const styleKey of component.style_keys ?? []) {
        const styleId = styleIds.get(styleKey);
        if (styleId) {
          pushEdge(edges, ctx, 'uses_style', componentId, styleId, componentPath);
        }
      }

      for (const surface of component.surfaces ?? []) {
        const surfaceId = pushNode(nodes, ctx, {
          kind: 'ui_surface',
          stableKey: `${app.stable_key}/${screen.stable_key}/${component.stable_key}/${surface.stable_key}`,
          name: surface.surface_kind,
          path: componentPath,
          parentId: componentId,
          language,
          signature: surface.library ?? surface.surface_kind,
          metadata: { surface_kind: surface.surface_kind, library: surface.library },
        });
        pushEdge(edges, ctx, 'contains', componentId, surfaceId, componentPath);
      }

      for (const control of component.controls ?? []) {
        const controlPath = control.source_path ?? componentPath;
        const controlId = pushNode(nodes, ctx, {
          kind: 'ui_control',
          stableKey: `${app.stable_key}/${screen.stable_key}/${component.stable_key}/${control.stable_key}`,
          name: control.name ?? control.label_default ?? control.stable_key,
          path: controlPath,
          parentId: componentId,
          language,
          location: control.location ?? null,
          signature: control.control_kind,
          metadata: {
            control_kind: control.control_kind,
            field_name: control.field_name,
            label_key: control.label_key,
          },
        });
        pushEdge(edges, ctx, 'contains', componentId, controlId, controlPath);

        if (control.field_name) {
          const fieldId = pushNode(nodes, ctx, {
            kind: 'ui_control',
            stableKey: `${app.stable_key}/field:${control.field_name}`,
            name: control.field_name,
            path: controlPath,
            language,
            signature: 'field',
            metadata: { field_name: control.field_name, synthetic_field: true },
          });
          pushEdge(edges, ctx, 'binds_field', controlId, fieldId, controlPath, {
            field_name: control.field_name,
          });
        }

        if (control.opens_flow_key) {
          const flowId = flowIds.get(control.opens_flow_key);
          if (flowId) {
            pushEdge(edges, ctx, 'opens_flow', controlId, flowId, controlPath);
          }
        }

        if (control.navigates_to_route_key) {
          const toRouteId = routeIds.get(control.navigates_to_route_key);
          if (toRouteId) {
            pushEdge(edges, ctx, 'navigates_to', controlId, toRouteId, controlPath);
          }
        }

        emitApiCalls(nodes, edges, ctx, controlId, controlPath, control.api_calls, lookups);
      }
    }
  }

  // Second pass: navigations whose target route was defined later.
  for (const route of app.routes ?? []) {
    const screen = route.screen;
    if (!screen) {
      continue;
    }
    const screenId = screenIds.get(screen.stable_key);
    if (!screenId) {
      continue;
    }
    const screenPath = screen.source_path ?? route.source_path ?? path;
    for (const nav of screen.navigations ?? []) {
      const toRouteId = routeIds.get(nav.to_route_key);
      if (!toRouteId) {
        continue;
      }
      const edgeId = uiEdgeId(ctx.parser_id, 'navigates_to', screenId, toRouteId);
      if (edges.some((edge) => edge.id === edgeId)) {
        continue;
      }
      pushEdge(edges, ctx, 'navigates_to', screenId, toRouteId, screenPath, {
        via: nav.via,
      });
    }
  }

  const serviceId = resolveBindsServiceTarget(app);
  if (serviceId) {
    pushEdge(edges, ctx, 'binds_service', appId, serviceId, path, {
      heuristic: 'name_path',
    });
  }

  return { nodes, edges };
}

export const reactUiIngestAdapter: IngestAdapter = {
  parser_id: 'react-ui',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const { apps, endpointLookup } = normalizeApps(model);
    const nodes: GraphNodeInput[] = [];
    const edges: GraphEdgeInput[] = [];

    for (const app of apps) {
      const result = transformApp(app, ctx, endpointLookup);
      nodes.push(...result.nodes);
      edges.push(...result.edges);
    }

    return { nodes, edges };
  },
};
