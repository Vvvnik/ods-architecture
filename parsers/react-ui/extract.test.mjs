import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, after } from 'node:test';

import { extractApiCallsFromSource, extractUiTree } from './extract.mjs';

describe('extractApiCallsFromSource', () => {
  it('extracts method and path from apiFetch', () => {
    const calls = extractApiCallsFromSource(`
export async function registerProject(body) {
  const { data } = await apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data;
}
`);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].path_template, '/projects');
  });
});

describe('extractUiTree', () => {
  /** @type {string} */
  let root;

  after(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('discovers app, routes, screens, styles, surfaces, and analysis-confirm flow', async () => {
    root = await mkdtemp(join(tmpdir(), 'ods-react-ui-'));
    const app = join(root, 'frontend');

    await mkdir(join(app, 'src/app'), { recursive: true });
    await mkdir(join(app, 'src/pages'), { recursive: true });
    await mkdir(join(app, 'src/styles'), { recursive: true });
    await mkdir(join(app, 'src/components/analysis'), { recursive: true });
    await mkdir(join(app, 'src/components/graph-view'), { recursive: true });
    await mkdir(join(app, 'src/context'), { recursive: true });
    await mkdir(join(app, 'src/api'), { recursive: true });

    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({
        name: 'fixture-frontend',
        dependencies: { react: '^18.0.0', 'react-router-dom': '^6.0.0' },
      }),
    );
    await writeFile(join(app, 'vite.config.ts'), 'export default {};\n');
    await writeFile(join(app, 'src/main.tsx'), 'import "./app/router";\n');

    await writeFile(
      join(app, 'src/app/router.tsx'),
      `import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ImportPage } from '../pages/ImportPage.js';
import { ProjectListPage } from '../pages/ProjectListPage.js';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { GraphViewPage } from '../pages/GraphViewPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'projects', element: <ProjectListPage /> },
      { path: 'projects/:projectId', element: <WorkspacePage /> },
      { path: 'projects/:projectId/graph-view', element: <GraphViewPage /> },
    ],
  },
]);
`,
    );

    await writeFile(
      join(app, 'src/pages/ImportPage.tsx'),
      `import { Link } from 'react-router-dom';
import { registerProject } from '../api/projects.js';

export function ImportPage() {
  return (
    <form>
      <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
      <input name="sourceValue" />
      <select name="sourceType" />
      <button type="submit">Register</button>
      <button type="button" onClick={goUp}>{GRAPH_UI_UP}</button>
      <button type="button" onClick={onEnter}>{GRAPH_UI_ENTER}</button>
      <Link to="/projects">Projects</Link>
    </form>
  );
}
`,
    );

    await writeFile(
      join(app, 'src/pages/ProjectListPage.tsx'),
      `import { Link } from 'react-router-dom';
export function ProjectListPage() {
  return <Link to="/import">Import</Link>;
}
`,
    );

    await writeFile(
      join(app, 'src/pages/WorkspacePage.tsx'),
      `export function WorkspacePage() {
  return <div>workspace</div>;
}
`,
    );

    await writeFile(
      join(app, 'src/pages/GraphViewPage.tsx'),
      `import styles from '../styles/graph-view.module.css';
import { GraphCanvas } from '../components/graph-view/GraphCanvas.js';

export function GraphViewPage() {
  return <div className={styles.page}><GraphCanvas /></div>;
}
`,
    );

    await writeFile(join(app, 'src/styles/graph-view.module.css'), '.page { color: red; }\n');

    await writeFile(
      join(app, 'src/components/graph-view/GraphCanvas.tsx'),
      `import { ReactFlow } from '@xyflow/react';
export function GraphCanvas() {
  return <ReactFlow />;
}
`,
    );

    await writeFile(
      join(app, 'src/api/projects.ts'),
      `import { apiFetch } from './client.js';
export async function registerProject(body) {
  return apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) });
}
`,
    );

    await writeFile(
      join(app, 'src/api/analysis.ts'),
      `import { apiFetch } from './client.js';
export async function startAnalysisRun(projectId, body) {
  return apiFetch(\`/projects/\${projectId}/analysis/runs\`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
`,
    );

    await writeFile(
      join(app, 'src/components/analysis/LanguagesConfirmModal.tsx'),
      `export function LanguagesConfirmModal() { return null; }
`,
    );
    await writeFile(
      join(app, 'src/components/analysis/ChangesConfirmModal.tsx'),
      `export function ChangesConfirmModal() { return null; }
`,
    );
    await writeFile(
      join(app, 'src/context/AnalysisProvider.tsx'),
      `import { LanguagesConfirmModal } from '../components/analysis/LanguagesConfirmModal.js';
import { ChangesConfirmModal } from '../components/analysis/ChangesConfirmModal.js';
export function AnalysisProvider() {
  return (
    <>
      <LanguagesConfirmModal />
      <ChangesConfirmModal />
    </>
  );
}
`,
    );

    const files = [
      'frontend/package.json',
      'frontend/vite.config.ts',
      'frontend/src/main.tsx',
      'frontend/src/app/router.tsx',
      'frontend/src/pages/ImportPage.tsx',
      'frontend/src/pages/ProjectListPage.tsx',
      'frontend/src/pages/WorkspacePage.tsx',
      'frontend/src/pages/GraphViewPage.tsx',
      'frontend/src/styles/graph-view.module.css',
      'frontend/src/components/graph-view/GraphCanvas.tsx',
      'frontend/src/api/projects.ts',
      'frontend/src/api/analysis.ts',
      'frontend/src/components/analysis/LanguagesConfirmModal.tsx',
      'frontend/src/components/analysis/ChangesConfirmModal.tsx',
      'frontend/src/context/AnalysisProvider.tsx',
    ];

    const model = await extractUiTree(root, files);
    assert.ok(model.apps.length >= 1, 'expected at least one app');
    const appModel = model.apps[0];
    assert.equal(appModel.framework, 'react');
    assert.equal(appModel.stable_key, 'frontend');

    const paths = appModel.routes.map((r) => r.path_pattern);
    assert.ok(paths.includes('/import'), `missing /import in ${paths.join(',')}`);
    assert.ok(paths.includes('/projects'), `missing /projects`);
    assert.ok(paths.includes('/projects/:projectId'), `missing workspace path`);
    assert.ok(paths.includes('/projects/:projectId/graph-view'), `missing graph-view`);

    const importRoute = appModel.routes.find((r) => r.path_pattern === '/import');
    assert.equal(importRoute.screen.component_name, 'ImportPage');
    assert.ok(
      importRoute.screen.navigations.some((n) => n.to_route_key === 'projects'),
      'expected Link navigation to projects',
    );
    assert.ok(
      importRoute.screen.components.some((c) =>
        c.controls?.some((ctrl) => ctrl.field_name === 'sourceValue' || ctrl.control_kind === 'input'),
      ),
      'expected form controls',
    );
    const allControls = importRoute.screen.components.flatMap((c) => c.controls ?? []);
    assert.ok(
      allControls.some((c) => c.stable_key === 'button-up'),
      `expected button-up, got ${allControls.map((c) => c.stable_key).join(',')}`,
    );
    assert.ok(
      allControls.some((c) => c.stable_key === 'button-enter'),
      'expected button-enter',
    );
    assert.ok(
      allControls.some((c) => c.stable_key === 'select-source-type' || c.stable_key === 'sourceType'),
      'expected select-source-type or sourceType',
    );
    assert.ok(
      importRoute.screen.components.some((c) =>
        c.controls?.some((ctrl) => ctrl.api_calls?.some((a) => a.path_template === '/projects')),
      ),
      'expected api_calls from projects module',
    );

    const graphView = appModel.routes.find((r) => r.stable_key === 'graph-view');
    assert.ok(graphView, 'expected graph-view route');
    assert.equal(graphView.screen.component_name, 'GraphViewPage');
    assert.ok(graphView.screen.style_keys.length >= 1, 'expected style_keys');
    assert.ok(
      appModel.styles.some((s) => s.kind === 'css_module'),
      'expected css_module in app.styles',
    );
    assert.ok(
      graphView.screen.surfaces?.some((s) => s.surface_kind === 'canvas'),
      'expected canvas surface via ReactFlow import',
    );

    assert.ok(appModel.flows.length >= 1, 'expected analysis-confirm flow');
    assert.equal(appModel.flows[0].stable_key, 'analysis-confirm');
    assert.ok(appModel.flows[0].steps.includes('LanguagesConfirmModal'));
  });
});
