import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Client } from '@elastic/elasticsearch';
import { ZipArchive } from 'archiver';

import {
  ANALYSIS_RUNS_INDEX,
  ELEMENTS_INDEX,
  GRAPH_EDGES_INDEX,
  GRAPH_NODES_INDEX,
  LANGUAGE_REPORTS_INDEX,
  PARSER_ENVELOPES_INDEX,
  PROJECTS_INDEX,
  SYNC_SNAPSHOTS_INDEX,
} from '../infra/elasticsearch.js';
import { AppError } from '../domain/errors.js';
import type { AiJobService } from './ai-job.service.js';
import type { DocsService } from './docs.service.js';

export interface ExportPackResult {
  filename: string;
  buffer: Buffer;
}

/**
 * Builds export-{projectId}-{timestamp}.zip with docs/ + es-data/ + README.
 * Allowed only when the current docs AiJob status is succeeded.
 */
export class DocsExportService {
  constructor(
    private readonly es: Client,
    private readonly docsService: DocsService,
    private readonly aiJobService: AiJobService,
  ) {}

  async buildPack(projectId: string): Promise<ExportPackResult> {
    const job = await this.aiJobService.getCurrent(projectId, 'docs_from_es');
    if (!job || job.status !== 'succeeded') {
      throw new AppError('docs_export_not_ready', undefined, 409);
    }

    const analysisRunId = job.analysis_run_id;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `export-${projectId}-${timestamp}`;
    const filename = `${folderName}.zip`;

    const tmpRoot = await mkdtemp(join(tmpdir(), 'ods-export-'));
    try {
      const packRoot = join(tmpRoot, folderName);
      const docsOut = join(packRoot, 'docs');
      const esOut = join(packRoot, 'es-data');
      await mkdir(docsOut, { recursive: true });
      await mkdir(esOut, { recursive: true });

      await this.copyDocsTree(projectId, docsOut);
      await this.writeEsSlice(projectId, analysisRunId, esOut);
      await this.writeReadme(packRoot, projectId, analysisRunId, job.id);
      await this.writeManifest(esOut, projectId, analysisRunId);

      const zipPath = join(tmpRoot, filename);
      await this.zipDirectory(packRoot, zipPath, folderName);
      const buffer = await readFile(zipPath);
      return { filename, buffer };
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  }

  private async copyDocsTree(projectId: string, destRoot: string): Promise<void> {
    const entries = await this.docsService.listTree(projectId);
    for (const entry of entries) {
      if (entry.type === 'dir') {
        await mkdir(join(destRoot, entry.path), { recursive: true });
        continue;
      }
      const content = await this.docsService.read(projectId, entry.path);
      const target = join(destRoot, entry.path);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, content, 'utf8');
    }
  }

  private async writeEsSlice(
    projectId: string,
    analysisRunId: string,
    esOut: string,
  ): Promise<void> {
    const byProject = [
      ELEMENTS_INDEX,
      SYNC_SNAPSHOTS_INDEX,
      LANGUAGE_REPORTS_INDEX,
      ANALYSIS_RUNS_INDEX,
    ] as const;

    for (const index of byProject) {
      const lines = await this.scrollToNdjson(index, {
        term: { project_id: projectId },
      });
      await writeFile(join(esOut, `${index}.ndjson`), lines, 'utf8');
    }

    try {
      const projectDoc = await this.es.get({ index: PROJECTS_INDEX, id: projectId });
      const src = projectDoc._source ?? {};
      await writeFile(
        join(esOut, `${PROJECTS_INDEX}.ndjson`),
        `${JSON.stringify({ index: PROJECTS_INDEX, id: projectId, source: src })}\n`,
        'utf8',
      );
    } catch {
      await writeFile(join(esOut, `${PROJECTS_INDEX}.ndjson`), '', 'utf8');
    }

    for (const index of [PARSER_ENVELOPES_INDEX, GRAPH_NODES_INDEX, GRAPH_EDGES_INDEX] as const) {
      const lines = await this.scrollToNdjson(index, {
        bool: {
          must: [{ term: { project_id: projectId } }, { term: { analysis_run_id: analysisRunId } }],
        },
      });
      await writeFile(join(esOut, `${index}.ndjson`), lines, 'utf8');
    }
  }

  private async scrollToNdjson(
    index: string,
    query: Record<string, unknown>,
  ): Promise<string> {
    const lines: string[] = [];
    const pageSize = 500;
    let response = await this.es.search({
      index,
      size: pageSize,
      scroll: '2m',
      query: query as never,
      _source: true,
    });

    for (;;) {
      const hits = response.hits.hits;
      if (hits.length === 0) break;
      for (const hit of hits) {
        lines.push(
          JSON.stringify({
            index,
            id: hit._id,
            source: hit._source,
          }),
        );
      }
      if (!response._scroll_id || hits.length < pageSize) break;
      response = await this.es.scroll({
        scroll_id: response._scroll_id,
        scroll: '2m',
      });
    }

    if (response._scroll_id) {
      await this.es.clearScroll({ scroll_id: response._scroll_id }).catch(() => undefined);
    }

    return lines.length ? `${lines.join('\n')}\n` : '';
  }

  private async writeManifest(
    esOut: string,
    projectId: string,
    analysisRunId: string,
  ): Promise<void> {
    const manifest = {
      format_version: 1,
      project_id: projectId,
      analysis_run_id: analysisRunId,
      exported_at: new Date().toISOString(),
      base_es_url_placeholder: 'BASE_ES_URL',
      note: 'Set BASE_ES_URL to the recipient Elasticsearch host (e.g. http://localhost:9200). Fetch links: {BASE_ES_URL}/{index}/_doc/{id}',
      indices: [
        PROJECTS_INDEX,
        ELEMENTS_INDEX,
        SYNC_SNAPSHOTS_INDEX,
        LANGUAGE_REPORTS_INDEX,
        ANALYSIS_RUNS_INDEX,
        PARSER_ENVELOPES_INDEX,
        GRAPH_NODES_INDEX,
        GRAPH_EDGES_INDEX,
      ],
    };
    await writeFile(join(esOut, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  private async writeReadme(
    packRoot: string,
    projectId: string,
    analysisRunId: string,
    jobId: string,
  ): Promise<void> {
    const body = `# ODS export pack

project_id: ${projectId}
analysis_run_id: ${analysisRunId}
docs_job_id: ${jobId}

## Contents

- \`docs/\` — Markdown project documentation including \`AGENT.md\` (prompt provenance).
- \`es-data/\` — NDJSON slices of Elasticsearch documents for this project/run + \`manifest.json\`.

## BASE_ES_URL

After loading \`es-data\` into your own Elasticsearch, set **BASE_ES_URL** to that
host (example: \`http://localhost:9200\`). Entity fetch links become:

\`\`\`text
{BASE_ES_URL}/{index}/_doc/{id}
\`\`\`

ODS does **not** rebuild the target system from this pack. Use docs + ES data for
evaluation or as input to an external rebuild attempt.
`;
    await writeFile(join(packRoot, 'README.md'), body, 'utf8');
  }

  private async zipDirectory(
    sourceDir: string,
    zipPath: string,
    rootFolderName: string,
  ): Promise<void> {
    await new Promise<void>((resolvePromise, reject) => {
      const output = createWriteStream(zipPath);
      const archive = new ZipArchive({ zlib: { level: 9 } });
      output.on('close', () => resolvePromise());
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, rootFolderName);
      void archive.finalize();
    });
  }
}
