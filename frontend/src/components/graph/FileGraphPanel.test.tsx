import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('../../api/graph.js', () => ({
  getFileDependencies: vi.fn(),
}));

import { getFileDependencies } from '../../api/graph.js';
import { FileGraphPanel } from './FileGraphPanel.js';

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <FileGraphPanel projectId="proj-1" filePath="WeatherForecast.cs" />
    </QueryClientProvider>,
  );
}

describe('FileGraphPanel US5', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nodes and edges from file dependencies API', async () => {
    vi.mocked(getFileDependencies).mockResolvedValue({
      path: 'WeatherForecast.cs',
      nodes: [
        {
          id: 'n1',
          project_id: 'proj-1',
          analysis_run_id: 'run-1',
          parser_id: 'csharp',
          kind: 'class',
          name: 'WeatherForecast',
          language: 'csharp',
          path: 'WeatherForecast.cs',
        },
      ],
      edges: [
        {
          id: 'e1',
          project_id: 'proj-1',
          analysis_run_id: 'run-1',
          parser_id: 'csharp',
          language: 'csharp',
          from: 'n1',
          to: 'n2',
          type: 'calls',
        },
      ],
    });

    renderPanel();

    expect(await screen.findByText('WeatherForecast')).toBeInTheDocument();
    expect(screen.getByText('calls')).toBeInTheDocument();
  });
});
