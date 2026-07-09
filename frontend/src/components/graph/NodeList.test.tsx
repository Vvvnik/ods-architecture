import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import type { GraphNode } from '../../api/graph-types.js';
import { NodeList } from './NodeList.js';

const sampleNode: GraphNode = {
  id: 'csharp:WeatherForecast.cs:class:WebApplication1.WeatherForecast',
  project_id: 'proj-1',
  analysis_run_id: 'run-1',
  parser_id: 'csharp',
  kind: 'class',
  name: 'WeatherForecast',
  qualified_name: 'WebApplication1.WeatherForecast',
  language: 'csharp',
  path: 'WeatherForecast.cs',
  element_id: 'el-1',
};

describe('NodeList US5', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onOpenFile without selecting the node', () => {
    const onSelect = vi.fn();
    const onOpenFile = vi.fn();

    render(
      <NodeList
        nodes={[sampleNode]}
        selectedNodeId={null}
        onSelect={onSelect}
        onOpenFile={onOpenFile}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Открыть файл' }));

    expect(onOpenFile).toHaveBeenCalledWith(sampleNode);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
