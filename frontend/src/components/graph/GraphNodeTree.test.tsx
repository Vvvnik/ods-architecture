import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { GraphNodeTree } from './GraphNodeTree.js';

vi.mock('../../api/graph.js', () => ({
  listGraphNodes: vi.fn(),
}));

import { listGraphNodes } from '../../api/graph.js';

const listMock = vi.mocked(listGraphNodes);

describe('GraphNodeTree', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('loads roots with parent_id=root and expands children', async () => {
    listMock.mockResolvedValueOnce({
      items: [
        {
          id: 'n1',
          project_id: 'p',
          analysis_run_id: 'r',
          parser_id: 'typescript',
          kind: 'file',
          name: 'App',
          language: 'typescript',
          path: 'src/App.ts',
          has_children: true,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    listMock.mockResolvedValueOnce({
      items: [
        {
          id: 'n2',
          project_id: 'p',
          analysis_run_id: 'r',
          parser_id: 'typescript',
          kind: 'function',
          name: 'main',
          language: 'typescript',
          path: 'src/App.ts',
          has_children: false,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });

    render(
      <GraphNodeTree
        projectId="p"
        analysisRunId="r"
        selectedNodeId={null}
        onSelect={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('App')).toBeTruthy());
    expect(listMock).toHaveBeenCalledWith(
      'p',
      expect.objectContaining({ parent_id: 'root' }),
    );

    fireEvent.click(screen.getByLabelText('Expand'));
    await waitFor(() => expect(screen.getByText('main')).toBeTruthy());
    expect(listMock).toHaveBeenCalledWith(
      'p',
      expect.objectContaining({ parent_id: 'n1' }),
    );
  });
});
