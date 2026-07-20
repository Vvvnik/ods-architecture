import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import { GraphSearch } from './GraphSearch.js';

vi.mock('../../api/graph.js', () => ({
  searchGraph: vi.fn(),
}));

import { searchGraph } from '../../api/graph.js';

const searchMock = vi.mocked(searchGraph);

describe('GraphSearch pagination (T024)', () => {
  it('requests the next page with an offset', async () => {
    searchMock.mockResolvedValueOnce({
      q: 'ma',
      nodes: {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `n${i}`,
          project_id: 'p',
          analysis_run_id: 'r',
          parser_id: 'typescript',
          kind: 'function',
          name: `fn${i}`,
          language: 'typescript',
          path: `src/a.ts`,
        })),
        total: 60,
        limit: 50,
        offset: 0,
      },
      edges: { items: [], total: 0, limit: 50, offset: 0 },
    });
    searchMock.mockResolvedValueOnce({
      q: 'ma',
      nodes: {
        items: [
          {
            id: 'n50',
            project_id: 'p',
            analysis_run_id: 'r',
            parser_id: 'typescript',
            kind: 'function',
            name: 'fn50',
            language: 'typescript',
            path: 'src/a.ts',
          },
        ],
        total: 60,
        limit: 50,
        offset: 50,
      },
      edges: { items: [], total: 0, limit: 50, offset: 50 },
    });

    render(
      <GraphSearch
        projectId="p"
        analysisRunId="r"
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'ma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(screen.getByText('fn0')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() =>
      expect(searchMock).toHaveBeenLastCalledWith(
        'p',
        expect.objectContaining({ q: 'ma', offset: 50, limit: 50 }),
      ),
    );
    await waitFor(() => expect(screen.getByText('fn50')).toBeTruthy());
  });
});
