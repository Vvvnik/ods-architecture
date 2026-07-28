import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJavaGrpcCalls } from './extract.mjs';

test('extracts Java grpc stub creation', () => {
  const source = 'var stub = OrdersServiceGrpc.newBlockingStub(channel); stub.GetOrder(null);';
  const calls = extractJavaGrpcCalls(source, 'src/main/java/OrdersClient.java');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target_service, 'OrdersService');
  assert.equal(calls[0].target_method, 'GetOrder');
});
