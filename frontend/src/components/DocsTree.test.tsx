import { describe, expect, it } from 'vitest';

import { buildDocsTree } from './DocsTree.js';

describe('buildDocsTree', () => {
  it('nests files under folders and sorts dirs before files', () => {
    const roots = buildDocsTree([
      { path: 'AGENT.md', type: 'file' },
      { path: 'backend', type: 'dir' },
      { path: 'backend/contracts', type: 'dir' },
      { path: 'backend/spec-backend.md', type: 'file' },
      { path: 'backend/contracts/http-api.md', type: 'file' },
      { path: 'spec-root.md', type: 'file' },
    ]);

    expect(roots.map((n) => n.name)).toEqual(['backend', 'AGENT.md', 'spec-root.md']);
    expect(roots[0].children.map((n) => n.name)).toEqual(['contracts', 'spec-backend.md']);
    expect(roots[0].children[0].children.map((n) => n.path)).toEqual([
      'backend/contracts/http-api.md',
    ]);
  });

  it('creates missing parent dirs from file paths alone', () => {
    const roots = buildDocsTree([{ path: 'a/b/c.md', type: 'file' }]);
    expect(roots).toHaveLength(1);
    expect(roots[0].path).toBe('a');
    expect(roots[0].children[0].path).toBe('a/b');
    expect(roots[0].children[0].children[0].path).toBe('a/b/c.md');
  });
});
