import { appsettingsIngestAdapter } from './adapters/appsettings.ingest.js';
import { busKafkaIngestAdapter } from './adapters/bus-kafka.ingest.js';
import { busRabbitIngestAdapter } from './adapters/bus-rabbit.ingest.js';
import { composeIngestAdapter } from './adapters/compose.ingest.js';
import { cppIngestAdapter } from './adapters/cpp.ingest.js';
import { csharpIngestAdapter } from './adapters/csharp.ingest.js';
import { dotnetApiRoutesIngestAdapter } from './adapters/dotnet-api-routes.ingest.js';
import { dotnetProjectIngestAdapter } from './adapters/dotnet-project.ingest.js';
import { openapiIngestAdapter } from './adapters/openapi.ingest.js';
import { pythonIngestAdapter } from './adapters/python.ingest.js';
import { tsApiRoutesIngestAdapter } from './adapters/ts-api-routes.ingest.js';
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
  registry.register(composeIngestAdapter);
  registry.register(appsettingsIngestAdapter);
  registry.register(openapiIngestAdapter);
  registry.register(dotnetProjectIngestAdapter);
  registry.register(busRabbitIngestAdapter);
  registry.register(busKafkaIngestAdapter);
  registry.register(tsApiRoutesIngestAdapter);
  registry.register(dotnetApiRoutesIngestAdapter);
}
