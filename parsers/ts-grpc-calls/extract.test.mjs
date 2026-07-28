import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTsGrpcCalls } from './extract.mjs';

test('extracts TypeScript grpc client call-site', () => {
  const calls = extractTsGrpcCalls('ordersClient.GetOrder({ id: "1" });', 'src/orders.ts');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target_service, 'OrdersService');
  assert.equal(calls[0].target_method, 'GetOrder');
});
