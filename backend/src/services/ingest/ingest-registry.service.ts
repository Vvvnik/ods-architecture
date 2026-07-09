import { cppIngestAdapter } from './adapters/cpp.ingest.js';
import { csharpIngestAdapter } from './adapters/csharp.ingest.js';
import { pythonIngestAdapter } from './adapters/python.ingest.js';
import { typescriptIngestAdapter } from './adapters/typescript.ingest.js';
import type { IngestAdapter } from './types.js';

export class IngestRegistryService {
  private readonly adapters = new Map<string, IngestAdapter>();

  register(adapter: IngestAdapter): void {
    this.adapters.set(adapter.parser_id, adapter);
  }

  get(parserId: string): IngestAdapter | undefined {
    return this.adapters.get(parserId);
  }

  listParserIds(): string[] {
    return [...this.adapters.keys()];
  }
}

export function registerBuiltinIngestAdapters(registry: IngestRegistryService): void {
  registry.register(typescriptIngestAdapter);
  registry.register(csharpIngestAdapter);
  registry.register(pythonIngestAdapter);
  registry.register(cppIngestAdapter);
}
