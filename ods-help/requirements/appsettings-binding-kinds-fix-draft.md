# Draft: appsettings ConnectionStrings binding kinds (fix)

**Status**: implemented (branch `fix/appsettings-connection-binding-kinds`, from `develop`)  
**Parent**: `specs/009-system-landscape` (US3 appsettings hardening — not a new numbered feature)

## Problem

Two related bug classes in the appsettings parser/ingest path (both show up on
large-monorepo Graph View smoke):

### A. ConnectionStrings kind short-circuit

Under `ConnectionStrings`, the parser treats **every** entry as
`binding_type=database` because the key path matches `connectionstring` **before**
content/key heuristics for broker/cache/storage/search:

| Key / value pattern | Today | Expected |
|---------------------|-------|----------|
| `ConnectionStrings:Provider` = `MSSql` / `Postgres` / `Npgsql` (provider name only) | fake `database` node named `Provider` | **not** a landscape node; use as **engine hint** for real CS in the same file |
| `ConnectionStrings:Rabbit` = `host=...:5672;...;virtualHost=` | `database` (engine may be `rabbitmq`) | `broker` + engine `rabbitmq` |
| `ConnectionStrings:Redis` = `host:6379,defaultDatabase=0` (StackExchange form) | `database` | `cache` + engine `redis` |
| `ConnectionStrings:Kafka` / MassTransit / `BootstrapServers=` under CS | `database` | `broker` + engine `kafka` (same root cause; may or may not appear in a given large monorepo) |
| MinIO / `s3://` / object-storage DSN under CS | `database` | `storage` (+ engine when known) |
| Elastic / OpenSearch URL or host under CS | `database` | `search` (schema already allows `search`) |
| HTTP(S) URL under CS (non-DSN) | `database` | `http_base_url` or skip node if not a real dependency DSN |
| `DefaultConnection` = `Host=...;Port=5432;Database=...` (Npgsql style, no "postgres" token) | `database`, **engine often missing** | `database` + engine `postgres` |
| `DefaultConnection` = `Data Source=...;Initial Catalog=...` or `Server=...;Database=...` + sibling `Provider=MSSql` | DB node without reliable engine when CS lacks engine tokens / placeholders empty | `database` + engine from Provider (`mssql` / `postgres` / …) |

**Root cause A:** early `connectionstring|…|database` ⇒ `database` short-circuit.

### B. Orphan “tail” nodes from structured `*Settings` sections

Any flattened leaf whose **key** contains `rabbit` / `kafka` / … becomes its own
`broker` (or similar) node — including scalars and credentials. Example shape
(synthetic):

```json
"RabbitSettings": {
  "RabbitHost": "broker.internal",
  "RabbitPort": 5672,
  "RabbitUserName": "guest",
  "RabbitPassword": "guest",
  "TimeoutInSeconds": 60
}
```

Today that can yield **five** broker-ish nodes such as
`RabbitSettings__TimeoutInSeconds`, `RabbitSettings__RabbitPort`, … with role
`inside` and **no useful topology**: they are not one broker, and they do not
clearly sit on the service→broker edge. Same class for other infra sections
when a technology token appears in the section/leaf name.

| Leaf role (generic) | Examples (leaf name patterns) | Today | Expected |
|---------------------|-------------------------------|-------|----------|
| Endpoint | `*Host`, `*Server`, `Address`, `Endpoint`, `Url` | separate infra node (or dropped) | contribute `target_hint` to **one** section node |
| Port | `*Port` | separate infra node | metadata on that node (or folded into `host:port` hint) |
| Credential | `*User*`, `*Password`, `*Secret*`, `*Key*` | separate infra node or noise | redact into `raw_redacted` / omit as node |
| Scalar config | `Timeout*`, `*Interval*`, `*TTL*`, `Prefetch*`, `Pool*`, `Flush*` | separate infra node (e.g. Timeout → broker) | **not** a node; optional metadata on the section node |
| Resource name | `Index*`, `Bucket*`, `VirtualHost`, `Database` | often separate / dropped | metadata on the section node |

Symmetric gaps (same large-monorepo pattern family, synthetic names only):

- `RedisSettings` (`RedisServer` + `RedisPort`) — often **no** cache node today
  (cache match is mostly `redis://`), or would become tails if key-matching
  is naïvely widened.
- `ElasticSettings` / `*ElasticSearch*` (`HostName`/`Address` + `Port` + index
  leaves) — often **no** search node; must not become one node per index/
  flush leaf.
- Object-storage settings (`*S3*`, MinIO-like) — credentials/bucket leaves must
  not become storage nodes; one storage node + service `connects_to`.

**Root cause B:** per-leaf emit when technology token ∈ key, with no section
coalesce and no leaf-role filter.

Do **not** hard-code service or product names from any external monorepo;
fixtures stay synthetic.

## Goals

1. **No fake infra nodes** from provider-name-only `ConnectionStrings:Provider`
   (and other provider-token-only leaves).
2. **Content/key-aware kinds** inside `ConnectionStrings`: database vs broker vs
   cache vs storage vs search (native schema already lists these enums; ingest
   must map them to Canon).
3. **Engine parity**: mark `mssql` and `postgres` (and `redis` / `rabbitmq` /
   `kafka` / …) via value heuristics **and** sibling `Provider` when present.
4. **One infra node per logical dependency** from a structured settings section
   (not one node per leaf). Scalar / credential / port-only tails never become
   standalone landscape nodes.
5. **Edges**: that infra node gets `connects_to` from the owning service
   (`service_hint` / path heuristic, same as today). Tail fields live **on** the
   infra node (metadata) or are omitted — they are not free-floating `inside`
   orphans and not separate services.
6. Keep DoD of `009` US3: each **recognized** real dependency → one infra node +
   `connects_to`; placeholders still skipped.

## Non-goals

- New Graph product / protocol filters.
- Renaming compose `service` vs compose `broker` dual nodes for the same
  compose service name (separate cleanup).
- Auth/secret vault resolution for empty `Data Source=` placeholders.
- Inventing new edge types for “property of broker”; reuse node `metadata` +
  existing `connects_to` (service → infra).

## Proposed rules (parser `parsers/appsettings/run.mjs`)

### A. ConnectionStrings — order of kind checks

Evaluate **before** “any ConnectionStrings key ⇒ database”:

1. **Provider selector**: leaf key `Provider` under `ConnectionStrings` (or
   flattened `ConnectionStrings__Provider`) whose value matches
   `/^(mssql|sqlserver|sql server|postgres|npgsql|postgresql|mysql|mariadb|sqlite)$/i`
   → emit binding `binding_type=other` (or omit from node-producing bindings)
   with `engine` normalized (`mssql` / `postgres` / …). Do **not** ingest as
   `database`/`broker`/`cache`.
2. **Broker**: key or value matches rabbit/amqp/kafka/masstransit /
   `bootstrapservers` / `amqp://` / typical `host=…:5672;…;virtualHost=`
   → `broker` (even under ConnectionStrings).
3. **Cache**: key/value matches redis, **or** StackExchange form
   `host:port,...,defaultDatabase=` (not only `redis://`)
   → `cache`.
4. **Storage**: MinIO / `s3://` / clear object-storage DSN under CS → `storage`.
5. **Search**: elastic / opensearch host or URL under CS → `search`.
6. **Database**: remaining ConnectionStrings / JDBC / Server+Database /
   Data Source+Initial Catalog / Host+Database forms that look like a DSN.
   Pure short tokens that are only provider names → Provider selector (rule 1).
7. **Engine detection** additions:
   - `Port=5432` + `Host=` (+ optional `Database=`) → `postgres`
   - `Data Source=` / `Initial Catalog=` / `Server=`+`Database=` — prefer
     Provider engine when present; else heuristic
   - Redis StackExchange host:port form → `redis`
   - Rabbit `host=...;virtualHost=` → `rabbitmq`
   - After per-binding detect: if a source has Provider engine and a database
     binding with empty/unknown engine, **copy** Provider engine onto that
     database binding (same file).

### B. Structured settings sections — coalesce, don’t emit tails

After flatten (or instead of naïve per-leaf emit for known infra sections):

1. **Detect section family** from the first path segment (case-insensitive), e.g.
   keys matching `^(Rabbit|Redis|Elastic|Kafka|Mongo|Minio|S3|.*Bus).*Settings$`
   or well-known `*FileStorage*` / `*ElasticSearch*` prefixes — **generic
   patterns only**, not product names.
2. **Classify each leaf** inside the section:
   - `endpoint` — host/server/address/url/uri/endpoint/bootstrap
   - `port` — `*Port`
   - `credential` — user/password/secret/key/token
   - `scalar` — timeout/interval/ttl/retry/prefetch/pool/flush/batch/size/count
   - `resource` — index/bucket/vhost/database/catalog/region/prefix
   - `other`
3. **Emit at most one node-producing binding per section** (per source file):
   - `binding_type` from section family: Rabbit/Kafka/Bus → `broker`; Redis →
     `cache`; Elastic/OpenSearch → `search`; S3/Minio/FileStorage → `storage`.
   - `key` = section name (e.g. `RabbitSettings`), **not**
     `RabbitSettings__TimeoutInSeconds`.
   - `target_hint` = endpoint leaf value, optionally `host:port` when port leaf
     exists and endpoint has no port.
   - `engine` from section family / detectEngine on section name.
   - `raw_redacted` = compact redacted summary of endpoint (+ optional resource),
     **not** a separate binding per credential/scalar.
4. **Never** emit node-producing bindings for `scalar`, `credential`, or
   port-only leaves — even if the flattened key contains `rabbit`/`redis`/….
5. If the same source also has `ConnectionStrings:Rabbit` / `:Redis`, **dedup**
   with the section binding by engine + target_hint / connection name so Graph
   View shows one infra node (ingest dedup keys must agree).
6. Widen cache/search detection for section endpoints (host+port pairs), not
   only URI schemes — but only via coalesce (rule 3), never via “any leaf with
   redis in the name ⇒ cache node”.

Optional metadata (nice-to-have, same binding object or ingest metadata):
`timeout_seconds`, `index_prefix`, etc. from scalar/resource leaves — attached
to the **one** infra node, not separate Canon nodes.

## Ingest (`appsettings.ingest.ts`)

- Map `binding_type=cache` → Canon infra node + `connects_to` (mirror broker).
  **Canon note:** `canonical-node-system.schema.json` today lists
  `database`/`broker`/`storage` only. Prefer extending Canon with `cache` (and
  `search` if emitted); if deferred, interim map `cache`/`search` → `storage`
  with `metadata.engine` (compose infra_kind fallback pattern) — decide in
  implement and record in `009` contracts.
- Map `binding_type=storage` / `search` similarly when parser emits them.
- Ignore `other` / provider-only / non-node leaf bindings.
- Preserve `metadata.engine` (and optional section scalars) on the infra node.
- Stable id/name for coalesced sections: **section name** or `target_hint`,
  never flattened `Section__TimeoutInSeconds`.
- Dedup: same kind + stable key within analysis → one node; multiple services
  may `connects_to` the same infra node when hints match.
- Ensure `connects_to` from resolved compose/service hint runs for coalesced
  section bindings the same way as for ConnectionStrings.

## Tests

Use **synthetic** appsettings fixtures only (no paths, DB names, or hosts from
any external monorepo):

**ConnectionStrings (A):**
- Provider=`MSSql` + DefaultConnection → one `database` (`mssql`), zero node
  for Provider; Provider=`Postgres`/`Npgsql` → engine `postgres` on DB.
- Npgsql-style CS without Provider (`Host=` + `Port=5432`) → `database` +
  `postgres`.
- `ConnectionStrings:Rabbit` / `:Redis` → broker / cache, not database.
- Optional: Kafka/BootstrapServers, MinIO/s3, Elastic under CS.

**Settings coalesce (B):**
- `RabbitSettings` with Host/Port/User/Password/`TimeoutInSeconds` → **exactly
  one** `broker` binding/node named for the section (or host hint); **zero**
  nodes named `…__TimeoutInSeconds` / `…__RabbitPort` / `…__RabbitPassword`.
- Ingest → one broker node + `connects_to` from service hint; timeout may appear
  only in metadata if implemented.
- `RedisSettings` Server+Port → one `cache` (not zero, not two).
- `ElasticSettings` / `*ElasticSearch*` Address/Host + Port + Index* +
  FlushInterval → one `search` (or interim storage); no node per index/flush.
- S3/MinIO-like settings with AccessKey/SecretKey/Bucket → one `storage`; no
  node per key/secret.
- Same file: `ConnectionStrings:Rabbit` + `RabbitSettings` → still one broker
  after dedup (or documented merge rule).

Extend `backend/tests/integration/appsettings-parser.test.ts` + ingest fixtures;
keep existing multi-CS database cases green.

## Spec touchpoints (when implementing)

- Clarify in `specs/009-system-landscape/spec.md` US3 / clarifications:
  - ConnectionStrings entries are classified by **content**, not section alone;
    provider-name keys are engine hints, not DB nodes.
  - Structured infra `*Settings` sections coalesce to **one** dependency node;
    scalar/credential leaves are not landscape nodes.
- Align `contracts/native-appsettings.schema.json` description; ingest contract
  rows for `cache` / `search` / coalesced section bindings → Canon +
  `connects_to`.

## Acceptance smoke (operator)

Re-analyze a **large monorepo** working copy used for Graph View (operator local
path / extra mount — any large .NET tree with mixed ConnectionStrings and
`*Settings` sections):

- No `database` node named `Provider`.
- `Rabbit` / `Redis` under ConnectionStrings appear as broker / cache (or
  agreed interim Canon mapping).
- Services with Port `5432` CS show `metadata.engine=postgres`; services with
  Provider `MSSql` + MSSQL-style CS show `mssql` on the real DB node (not on a
  Provider node).
- **No orphan tails**: no broker/cache/search/storage nodes whose names are
  `*Settings__Timeout*`, `*Settings__*Port`, `*Settings__*Password`,
  `*Settings__Flush*`, `*Settings__Index*` alone, etc.
- Each such section → at most one infra node, with `connects_to` from the
  owning service when `service_hint` resolves.

## Implementation order

1. Parser: ConnectionStrings kind order + engine hints + unit coverage.
2. Parser: settings-section coalesce + leaf-role filter (kill orphan tails).
3. Ingest: `cache`/`search`/`storage` mapping + skip non-node bindings + dedup
   with CS; Canon enum extend or interim `storage` mapping.
4. Spec/contract notes under `009`.
5. Re-run large-monorepo analysis and spot-check Graph View inspector
   (Provider / Rabbit / Redis / no Timeout tails / service→broker edge).
