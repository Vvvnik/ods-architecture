import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSpringRoutes, extractGatewayYamlRoutes } from './extract.mjs';

test('combines controller and method mapping paths', () => {
  const routes = extractSpringRoutes(`
    @RestController @RequestMapping("/owners")
    class OwnerController {
      @GetMapping("/{id}") public Owner getOwner() { return null; }
      @RequestMapping(path="/search", method=RequestMethod.POST) public void search() {}
    }`, 'customers/src/main/java/OwnerController.java');
  assert.deepEqual(routes.map(({ method, path }) => ({ method, path })), [
    { method: 'GET', path: '/owners/{id}' },
    { method: 'POST', path: '/owners/search' },
  ]);
});

test('extracts static Gateway Path predicates from YAML (SHOULD)', () => {
  const yaml = `
spring:
  cloud:
    gateway:
      routes:
        - id: owners
          predicates:
            - Path=/api/owners/**
`;
  const routes = extractGatewayYamlRoutes(yaml, 'api-gateway/src/main/resources/application.yml');
  assert.equal(routes.length, 1);
  assert.equal(routes[0].route_kind, 'gateway');
  assert.equal(routes[0].path, '/api/owners');
});
