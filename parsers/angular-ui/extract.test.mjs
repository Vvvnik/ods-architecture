import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, after } from 'node:test';

import { extractUiTree, parseAngularRouteTable } from './extract.mjs';

describe('parseAngularRouteTable', () => {
  it('extracts path + component and loadChildren', () => {
    const routes = parseAngularRouteTable(`
import { FooComponent } from './foo.component';
import { BarComponent } from './bar.component';
const routes: Routes = [
  { path: 'foo', component: FooComponent },
  { path: 'list/:id', component: BarComponent },
  {
    path: 'history',
    loadChildren: () => import('./modules/expertise-history/expertise-history.module')
      .then(m => m.ExpertiseHistoryModule)
  },
  { path: '**', component: FooComponent },
];
`);
    assert.equal(routes.length, 3);
    assert.equal(routes[0].path_pattern, '/foo');
    assert.equal(routes[0].element_name, 'FooComponent');
    assert.equal(routes[1].path_pattern, '/list/:id');
    assert.equal(routes[2].path_pattern, '/history');
    assert.equal(routes[2].load_hint, 'ExpertiseHistory');
  });
});

describe('extractUiTree', () => {
  /** @type {string} */
  let root;

  after(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('discovers Angular app with routes and screens', async () => {
    root = await mkdtemp(join(tmpdir(), 'ods-angular-ui-'));
    const app = join(root, 'client');
    await mkdir(join(app, 'src/app/components'), { recursive: true });

    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({
        name: 'fixture-angular-client',
        dependencies: { '@angular/core': '~13.0.0', '@angular/router': '~13.0.0' },
      }),
    );
    await writeFile(
      join(app, 'angular.json'),
      JSON.stringify({ version: 1, projects: { app: { projectType: 'application' } } }),
    );
    await writeFile(join(app, 'src/main.ts'), 'import("./app/app.module");\n');
    await writeFile(
      join(app, 'src/app/app-routing.module.ts'),
      `import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListComponent } from './components/list.component';
import { DetailComponent } from './components/detail.component';

const routes: Routes = [
  { path: 'list', component: ListComponent },
  { path: 'detail/:id', component: DetailComponent },
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  { path: '**', component: ListComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
`,
    );
    await writeFile(join(app, 'src/app/components/list.component.ts'), 'export class ListComponent {}\n');
    await writeFile(join(app, 'src/app/components/detail.component.ts'), 'export class DetailComponent {}\n');

    const { apps } = await extractUiTree(root, []);
    assert.equal(apps.length, 1);
    assert.equal(apps[0].framework, 'angular');
    assert.ok(apps[0].routes.length >= 2);
    const paths = apps[0].routes.map((r) => r.path_pattern).sort();
    assert.deepEqual(paths, ['/detail/:id', '/list']);
    assert.ok(apps[0].routes.every((r) => r.screen?.name));
  });
});
