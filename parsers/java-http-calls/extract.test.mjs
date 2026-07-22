import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJavaHttpCalls, resolveUriExpression, collectStringConstants,
  resolveDiscoveryServiceName,
} from './extract.mjs';

test('extracts Feign method mappings', () => {
  const calls = extractJavaHttpCalls('@FeignClient(name="vets-service", path="/vets") interface Vets { @GetMapping("/{id}") Vet get(); }', 'customers/src/main/java/Vets.java');
  assert.deepEqual(calls[0], {
    method: 'GET', path: '/vets/{id}', source_path: 'customers/src/main/java/Vets.java',
    client_kind: 'feign', service_hint: 'customers', callee_service_hint: 'vets-service',
  });
});

test('extracts WebClient literal URI', () => {
  const calls = extractJavaHttpCalls('class C { WebClient webClient; void x() { webClient.post().uri("/visits").retrieve(); } }', 'customers/src/main/java/C.java');
  assert.equal(calls[0].client_kind, 'webclient');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].path, '/visits');
});

test('resolves hostname field + path concat (petclinic VisitsServiceClient)', () => {
  const source = `
    class VisitsServiceClient {
      private String hostname = "http://visits-service/";
      private final WebClient.Builder webClientBuilder;
      Mono get() {
        return webClientBuilder.build().get()
          .uri(hostname + "pets/visits?petId={petId}", ids)
          .retrieve().bodyToMono(Visits.class);
      }
    }`;
  const calls = extractJavaHttpCalls(source, 'api-gateway/src/main/java/VisitsServiceClient.java');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].path, '/pets/visits');
  assert.equal(calls[0].callee_service_hint, 'visits-service');
  assert.equal(calls[0].service_hint, 'api-gateway');
});

test('resolves local String const + path (genai VectorStoreController)', () => {
  const source = `
    class VectorStoreController {
      private final WebClient webClient;
      void load() {
        String vetsHostname = "http://vets-service/";
        webClient.get().uri(vetsHostname + "vets").retrieve();
      }
    }`;
  const calls = extractJavaHttpCalls(source, 'genai-service/src/main/java/VectorStoreController.java');
  assert.equal(calls[0].path, '/vets');
  assert.equal(calls[0].callee_service_hint, 'vets-service');
});

test('skips unresolved method-call URI without discovery body', () => {
  assert.equal(resolveUriExpression('getCustomerServiceUri() + "/owners"', collectStringConstants(''), ''), null);
});

test('resolveDiscoveryServiceName reads getInstances', () => {
  const src = `
    private URI getCustomerServiceUri() {
      return discoveryClient.getInstances("customers-service").get(0).getUri();
    }`;
  assert.equal(resolveDiscoveryServiceName(src, 'getCustomerServiceUri'), 'customers-service');
});

test('extracts RestClient with discovery helper (petclinic AIDataProvider)', () => {
  const source = `
    class AIDataProvider {
      private final RestClient restClient;
      public List getAllOwners() {
        return restClient.get().uri(getCustomerServiceUri() + "/owners").retrieve().body(List.class);
      }
      public PetDetails addPetToOwner(int ownerId, PetRequest petRequest) {
        return restClient.post().uri(getCustomerServiceUri() + "/owners/" + ownerId + "/pets")
          .body(petRequest).retrieve().body(PetDetails.class);
      }
      public OwnerDetails addOwnerToPetclinic(OwnerRequest ownerRequest) {
        return restClient.post().uri(getCustomerServiceUri() + "/owners")
          .body(ownerRequest).retrieve().body(OwnerDetails.class);
      }
      private URI getCustomerServiceUri() {
        return discoveryClient.getInstances("customers-service").get(0).getUri();
      }
    }`;
  const calls = extractJavaHttpCalls(source, 'genai-service/src/main/java/AIDataProvider.java');
  const rest = calls.filter((c) => c.client_kind === 'restclient');
  assert.equal(rest.length, 3);
  assert.deepEqual(
    rest.map((c) => `${c.method} ${c.path}`).sort(),
    ['GET /owners', 'POST /owners', 'POST /owners/{ownerId}/pets'],
  );
  assert.ok(rest.every((c) => c.callee_service_hint === 'customers-service'));
  assert.ok(rest.every((c) => c.service_hint === 'genai-service'));
});

test('extracts RestTemplate getForObject and exchange', () => {
  const source = `
    class Client {
      RestTemplate restTemplate;
      void run() {
        restTemplate.getForObject("http://vets-service/vets/{id}", Vet.class, id);
        restTemplate.exchange("http://visits-service/visits", HttpMethod.POST, entity, Void.class);
        restTemplate.getForObject(dynamicUrl(), String.class);
      }
    }`;
  const calls = extractJavaHttpCalls(source, 'customers-service/src/main/java/Client.java');
  const rt = calls.filter((c) => c.client_kind === 'resttemplate');
  assert.equal(rt.length, 2);
  assert.deepEqual(
    rt.map((c) => `${c.method} ${c.path}`).sort(),
    ['GET /vets/{id}', 'POST /visits'],
  );
  assert.equal(rt.find((c) => c.method === 'GET')?.callee_service_hint, 'vets-service');
});

test('extracts HttpURLConnection with setRequestMethod', () => {
  const source = `
    class Raw {
      void run() throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL("http://customers-service/owners").openConnection();
        c.setRequestMethod("GET");
      }
    }`;
  const calls = extractJavaHttpCalls(source, 'genai-service/src/main/java/Raw.java');
  const raw = calls.filter((c) => c.client_kind === 'httpurlconnection');
  assert.equal(raw.length, 1);
  assert.equal(raw[0].method, 'GET');
  assert.equal(raw[0].path, '/owners');
  assert.equal(raw[0].callee_service_hint, 'customers-service');
});
