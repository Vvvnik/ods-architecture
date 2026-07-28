import { appsettingsIngestAdapter } from './adapters/appsettings.ingest.js';
import { busKafkaIngestAdapter } from './adapters/bus-kafka.ingest.js';
import { busRabbitIngestAdapter } from './adapters/bus-rabbit.ingest.js';
import { composeIngestAdapter } from './adapters/compose.ingest.js';
import { cppIngestAdapter } from './adapters/cpp.ingest.js';
import { csharpIngestAdapter } from './adapters/csharp.ingest.js';
import { dotnetApiRoutesIngestAdapter } from './adapters/dotnet-api-routes.ingest.js';
import { dotnetHttpCallsIngestAdapter } from './adapters/dotnet-http-calls.ingest.js';
import { dotnetProjectIngestAdapter } from './adapters/dotnet-project.ingest.js';
import {
  dotnetGrpcCallsIngestAdapter,
  javaGrpcCallsIngestAdapter,
  pythonGrpcCallsIngestAdapter,
  tsGrpcCallsIngestAdapter,
} from './adapters/grpc-calls.ingest.js';
import { grpcProtoIngestAdapter } from './adapters/grpc-proto.ingest.js';
import { javaIngestAdapter } from './adapters/java.ingest.js';
import { javaApiRoutesIngestAdapter } from './adapters/java-api-routes.ingest.js';
import { javaHttpCallsIngestAdapter } from './adapters/java-http-calls.ingest.js';
import { mavenProjectIngestAdapter } from './adapters/maven-project.ingest.js';
import { gradleProjectIngestAdapter } from './adapters/gradle-project.ingest.js';
import { openapiIngestAdapter } from './adapters/openapi.ingest.js';
import { pythonIngestAdapter } from './adapters/python.ingest.js';
import { pythonApiRoutesIngestAdapter } from './adapters/python-api-routes.ingest.js';
import { pythonHttpCallsIngestAdapter } from './adapters/python-http-calls.ingest.js';
import { springConfigIngestAdapter } from './adapters/spring-config.ingest.js';
import { tsApiRoutesIngestAdapter } from './adapters/ts-api-routes.ingest.js';
import { tsHttpCallsIngestAdapter } from './adapters/ts-http-calls.ingest.js';
import { typescriptIngestAdapter } from './adapters/typescript.ingest.js';
import { reactUiIngestAdapter } from './adapters/react-ui.ingest.js';
import { angularUiIngestAdapter } from './adapters/angular-ui.ingest.js';
import { angularjsUiIngestAdapter } from './adapters/angularjs-ui.ingest.js';
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
  registry.register(javaIngestAdapter);
  registry.register(composeIngestAdapter);
  registry.register(appsettingsIngestAdapter);
  registry.register(openapiIngestAdapter);
  registry.register(dotnetProjectIngestAdapter);
  registry.register(busRabbitIngestAdapter);
  registry.register(busKafkaIngestAdapter);
  registry.register(tsApiRoutesIngestAdapter);
  registry.register(dotnetApiRoutesIngestAdapter);
  registry.register(tsHttpCallsIngestAdapter);
  registry.register(tsGrpcCallsIngestAdapter);
  registry.register(mavenProjectIngestAdapter);
  registry.register(gradleProjectIngestAdapter);
  registry.register(springConfigIngestAdapter);
  registry.register(javaApiRoutesIngestAdapter);
  registry.register(javaHttpCallsIngestAdapter);
  registry.register(javaGrpcCallsIngestAdapter);
  registry.register(dotnetGrpcCallsIngestAdapter);
  registry.register(dotnetHttpCallsIngestAdapter);
  registry.register(pythonApiRoutesIngestAdapter);
  registry.register(pythonHttpCallsIngestAdapter);
  registry.register(pythonGrpcCallsIngestAdapter);
  registry.register(grpcProtoIngestAdapter);
  registry.register(reactUiIngestAdapter);
  registry.register(angularUiIngestAdapter);
  registry.register(angularjsUiIngestAdapter);
}
