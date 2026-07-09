import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import type { AppConfig } from '../config.js';

const manifestSchema = z.object({
  id: z.string().min(1),
  languages: z.array(z.string().min(1)).min(1),
  schema_version: z.string().min(1),
  command: z.array(z.string().min(1)).min(1),
  timeout_ms: z.number().int().positive().optional(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()),
});

export type ParserManifest = z.infer<typeof manifestSchema>;

export class ParserRegistryService {
  private readonly manifests = new Map<string, ParserManifest>();
  private readonly languageToParserId = new Map<string, string>();
  private loaded = false;

  constructor(private readonly config: AppConfig) {}

  async load(): Promise<void> {
    this.manifests.clear();
    this.languageToParserId.clear();

    let entries: string[] = [];
    try {
      entries = await readdir(this.config.PARSERS_ROOT);
    } catch {
      this.loaded = true;
      return;
    }

    for (const entry of entries) {
      const manifestPath = join(this.config.PARSERS_ROOT, entry, 'manifest.json');
      try {
        const raw = await readFile(manifestPath, 'utf8');
        const parsed = manifestSchema.parse(JSON.parse(raw));
        if (parsed.id !== entry) {
          continue;
        }
        this.manifests.set(parsed.id, parsed);
        for (const language of parsed.languages) {
          this.languageToParserId.set(language, parsed.id);
        }
      } catch {
        // skip invalid manifests
      }
    }

    this.loaded = true;
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }
  }

  getManifest(parserId: string): ParserManifest | null {
    return this.manifests.get(parserId) ?? null;
  }

  resolveParserId(language: string): string | null {
    return this.languageToParserId.get(language) ?? null;
  }

  listManifests(): ParserManifest[] {
    return [...this.manifests.values()];
  }
}
