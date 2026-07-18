import { describe, expect, it } from 'vitest';

import {
  IngestRegistryService,
  registerBuiltinIngestAdapters,
} from '../../../src/services/ingest/ingest-registry.service.js';

describe('java ingest registration (018 US4)', () => {
  it('registers java adapter among builtins', () => {
    const registry = new IngestRegistryService();
    registerBuiltinIngestAdapters(registry);
    expect(registry.get('java')?.parser_id).toBe('java');
  });
});
