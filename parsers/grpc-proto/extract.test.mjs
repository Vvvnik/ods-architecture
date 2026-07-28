import assert from 'node:assert/strict';
import test from 'node:test';
import { extractGrpcProto } from './extract.mjs';

test('extracts services and rpc methods from proto', () => {
  const source = `
syntax = "proto3";
package demo.v1;

service OrdersService {
  rpc GetOrder(GetOrderRequest) returns (GetOrderResponse);
  rpc StreamOrders(stream GetOrderRequest) returns (stream GetOrderResponse);
}
`;
  const services = extractGrpcProto(source, 'proto/demo/v1/orders.proto');
  assert.equal(services.length, 1);
  assert.equal(services[0].package, 'demo.v1');
  assert.equal(services[0].name, 'OrdersService');
  assert.equal(services[0].methods.length, 2);
  assert.equal(services[0].methods[1].client_streaming, true);
  assert.equal(services[0].methods[1].server_streaming, true);
});
