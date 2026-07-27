import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceHintFromPath, shortenMonorepoModuleHint } from './extract.mjs';

test('shortenMonorepoModuleHint drops org-product when 4+ tokens', () => {
  assert.equal(shortenMonorepoModuleHint('acme-platform-customers-service'), 'customers-service');
  assert.equal(shortenMonorepoModuleHint('acme-platform-api-gateway'), 'api-gateway');
  assert.equal(shortenMonorepoModuleHint('customers-service'), 'customers-service');
  assert.equal(shortenMonorepoModuleHint('genai-service'), 'genai-service');
});

test('serviceHintFromPath uses module dir before src/main/java', () => {
  assert.equal(
    serviceHintFromPath('acme-platform-customers-service/src/main/java/App.java'),
    'customers-service',
  );
  assert.equal(
    serviceHintFromPath('customers-service/src/main/java/App.java'),
    'customers-service',
  );
});
