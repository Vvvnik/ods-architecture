import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpringConfig } from './extract.mjs';

test('extracts YAML port and JDBC engine', () => {
  const config = parseSpringConfig('customers/src/main/resources/application.yml', 'server:\n  port: 8081\nspring:\n  datasource:\n    url: jdbc:postgresql://db/customers\n');
  assert.equal(config.port, 8081);
  assert.equal(config.datasources[0].engine, 'postgresql');
});

test('extracts properties and skips placeholder datasource', () => {
  const config = parseSpringConfig('vets/application.properties', 'server.port=8082\nspring.datasource.url=${DB_URL}\n');
  assert.equal(config.port, 8082);
  assert.deepEqual(config.datasources, []);
});
