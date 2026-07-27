import { describe, expect, it } from 'vitest';

import {
  buildLocalPathAliases,
  mapLocalPathToFsRoot,
  splitHostContainerEntry,
} from '../../src/services/local-path-map.js';

describe('local-path-map', () => {
  it('maps host fixture path to /repos', () => {
    const aliases = buildLocalPathAliases({
      localReposMount: '/repos',
      localReposHostPath: '/absolute/path/to/fixtures/repos',
    });
    expect(
      mapLocalPathToFsRoot('/absolute/path/to/fixtures/repos/sample-project', aliases),
    ).toBe('/repos/sample-project');
  });

  it('maps host monorepo under broader parent', () => {
    const aliases = buildLocalPathAliases({
      localReposMount: '/repos',
      localReposHostPath: '/absolute/path/to/parent',
    });
    expect(mapLocalPathToFsRoot('/absolute/path/to/parent/org/monorepo', aliases)).toBe(
      '/repos/org/monorepo',
    );
  });

  it('keeps /repos paths unchanged when no host alias matches', () => {
    const aliases = buildLocalPathAliases({
      localReposMount: '/repos',
      localReposHostPath: '/absolute/path/to/fixtures/repos',
    });
    expect(mapLocalPathToFsRoot('/repos/sample-project', aliases)).toBe('/repos/sample-project');
  });

  it('applies LOCAL_PATH_MAP with longest host prefix first', () => {
    const aliases = buildLocalPathAliases({
      localReposMount: '/repos',
      localReposHostPath: '/absolute/path/to/parent',
      localPathMap:
        '/absolute/path/to/other-repos:/repos-extra,/absolute/path/to/fixtures/repos:/repos',
    });
    expect(mapLocalPathToFsRoot('/absolute/path/to/other-repos/monorepo', aliases)).toBe(
      '/repos-extra/monorepo',
    );
    expect(
      mapLocalPathToFsRoot('/absolute/path/to/fixtures/repos/sample-project', aliases),
    ).toBe('/repos/sample-project');
  });

  it('ignores empty host path', () => {
    const aliases = buildLocalPathAliases({
      localReposMount: '/repos',
      localReposHostPath: '',
    });
    expect(aliases).toEqual([]);
  });

  it('splits Windows drive LOCAL_PATH_MAP on :/ not the drive colon', () => {
    expect(splitHostContainerEntry('C:/Users/me/code:/repos-extra')).toEqual({
      host: 'C:/Users/me/code',
      container: '/repos-extra',
    });
    expect(splitHostContainerEntry(String.raw`C:\Users\me\code:/repos-extra`)).toEqual({
      host: 'C:/Users/me/code',
      container: '/repos-extra',
    });
  });

  it('maps Windows host paths with backslashes via LOCAL_PATH_MAP', () => {
    const aliases = buildLocalPathAliases({
      localReposMount: '/repos',
      localReposHostPath: '',
      localPathMap: String.raw`C:\Users\me\code:/repos-extra`,
    });
    expect(mapLocalPathToFsRoot(String.raw`C:\Users\me\code\my-app`, aliases)).toBe(
      '/repos-extra/my-app',
    );
    expect(mapLocalPathToFsRoot('c:/Users/me/code/my-app', aliases)).toBe('/repos-extra/my-app');
  });

  it('maps Windows LOCAL_REPOS_HOST_PATH with backslashes', () => {
    const aliases = buildLocalPathAliases({
      localReposMount: '/repos',
      localReposHostPath: String.raw`D:\ods\docker\fixtures\repos`,
    });
    expect(
      mapLocalPathToFsRoot(String.raw`D:\ods\docker\fixtures\repos\sample-project`, aliases),
    ).toBe('/repos/sample-project');
  });
});
