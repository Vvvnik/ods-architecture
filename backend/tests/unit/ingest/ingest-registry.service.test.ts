import { describe, expect, it } from 'vitest';

import { cppIngestAdapter } from '../../../src/services/ingest/adapters/cpp.ingest.js';
import { csharpIngestAdapter } from '../../../src/services/ingest/adapters/csharp.ingest.js';
import { pythonIngestAdapter } from '../../../src/services/ingest/adapters/python.ingest.js';
import { typescriptIngestAdapter } from '../../../src/services/ingest/adapters/typescript.ingest.js';
import {
  IngestRegistryService,
  registerBuiltinIngestAdapters,
} from '../../../src/services/ingest/ingest-registry.service.js';

describe('registerBuiltinIngestAdapters', () => {
  it('registers typescript, csharp, python, and cpp adapters', () => {
    const registry = new IngestRegistryService();
    registerBuiltinIngestAdapters(registry);

    expect(registry.listParserIds().sort()).toEqual(['cpp', 'csharp', 'python', 'typescript']);
    expect(registry.get('typescript')).toBe(typescriptIngestAdapter);
    expect(registry.get('csharp')).toBe(csharpIngestAdapter);
    expect(registry.get('python')).toBe(pythonIngestAdapter);
    expect(registry.get('cpp')).toBe(cppIngestAdapter);
  });
});
