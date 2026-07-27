import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractHttpCallsFromText,
  extractStatesFromText,
  extractUiTree,
  discoverAngularJsRoots,
} from './extract.mjs';

describe('angularjs-ui extract (021)', () => {
  it('extracts non-abstract states and skips abstract parents', () => {
    const text = `
      $stateProvider
        .state('app', { abstract: true, url: '', template: ' ' })
        .state('welcome', { parent: 'app', url: '/welcome', template: ' ' })
        .state('owners', { parent: 'app', url: '/owners', template: ' ' });
    `;
    const states = extractStatesFromText(text, 'scripts/app.js');
    expect(states.find((s) => s.name === 'app')?.abstract).toBe(true);
    expect(states.filter((s) => !s.abstract && s.url).map((s) => s.name)).toEqual([
      'welcome',
      'owners',
    ]);
  });

  it('extracts literal $http calls', () => {
    const calls = extractHttpCallsFromText(`
      $http.get('api/customer/owners').then(function (resp) {});
      $http.post("/api/x", {});
    `);
    expect(calls).toEqual([
      { method: 'GET', path_template: '/api/customer/owners' },
      { method: 'POST', path_template: '/api/x' },
    ]);
  });

  it('discovers gateway static scripts root', () => {
    const roots = discoverAngularJsRoots([
      'sample-api-gateway/src/main/resources/static/scripts/app.js',
      'sample-api-gateway/src/main/resources/static/scripts/owner-list/owner-list.js',
    ]);
    expect(roots[0]).toContain('static/scripts');
  });

  it('prefers *-ui module over gateway static scripts', () => {
    const roots = discoverAngularJsRoots([
      'sample-ui/scripts/app.js',
      'sample-api-gateway/src/main/resources/static/scripts/app.js',
    ]);
    expect(roots).toEqual(['sample-ui']);
  });

  it('builds app with ≥3 non-abstract routes and owners $http bind', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-angularjs-ui-'));
    const scripts = join(
      root,
      'sample-api-gateway/src/main/resources/static/scripts',
    );
    await mkdir(join(scripts, 'owner-list'), { recursive: true });
    await mkdir(join(scripts, 'vet-list'), { recursive: true });

    await writeFile(
      join(scripts, 'app.js'),
      `'use strict';
var petClinicApp = angular.module('petClinicApp', ['ui.router', 'ownerList', 'vetList']);
petClinicApp.config(['$stateProvider', function($stateProvider) {
  $stateProvider
    .state('app', { abstract: true, url: '', template: ' ' })
    .state('welcome', { parent: 'app', url: '/welcome', template: ' ' });
}]);
`,
      'utf8',
    );
    await writeFile(
      join(scripts, 'owner-list/owner-list.js'),
      `angular.module('ownerList', ['ui.router'])
.config(['$stateProvider', function ($stateProvider) {
  $stateProvider.state('owners', { parent: 'app', url: '/owners', template: ' ' });
}]);
`,
      'utf8',
    );
    await writeFile(
      join(scripts, 'owner-list/owner-list.controller.js'),
      `angular.module('ownerList')
.controller('OwnerListController', ['$http', function ($http) {
  $http.get('api/customer/owners').then(function (resp) { self.owners = resp.data; });
}]);
`,
      'utf8',
    );
    await writeFile(
      join(scripts, 'vet-list/vet-list.js'),
      `angular.module('vetList', ['ui.router'])
.config(['$stateProvider', function ($stateProvider) {
  $stateProvider.state('vets', { parent: 'app', url: '/vets', template: ' ' });
}]);
`,
      'utf8',
    );
    await writeFile(
      join(scripts, 'vet-list/vet-list.controller.js'),
      `angular.module('vetList').controller('VetListController', ['$http', function ($http) {
  $http.get('api/vet/vets').then(function () {});
}]);
`,
      'utf8',
    );

    const files = [
      'sample-api-gateway/src/main/resources/static/scripts/app.js',
      'sample-api-gateway/src/main/resources/static/scripts/owner-list/owner-list.js',
      'sample-api-gateway/src/main/resources/static/scripts/owner-list/owner-list.controller.js',
      'sample-api-gateway/src/main/resources/static/scripts/vet-list/vet-list.js',
      'sample-api-gateway/src/main/resources/static/scripts/vet-list/vet-list.controller.js',
    ];

    const model = await extractUiTree(root, files);
    expect(model.apps.length).toBe(1);
    const routes = model.apps[0].routes;
    expect(routes.map((r) => r.stable_key).sort()).toEqual(['owners', 'vets', 'welcome']);
    expect(routes.every((r) => r.stable_key !== 'app')).toBe(true);
    const owners = routes.find((r) => r.stable_key === 'owners');
    expect(owners.screen.api_calls?.some((c) => c.path_template.includes('owners'))).toBe(true);
  });
});
