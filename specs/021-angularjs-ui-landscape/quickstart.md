# Quickstart: AngularJS UI landscape (021)

**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Prerequisites

- Stack up: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
  (rebuild backend / parser image after `angularjs-ui` lands).
- Dogfood project: spring-petclinic-microservices already imported
  (`project_id` `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`) or re-import from the
  same remote.
- Confirm WC layout: AngularJS under
  `spring-petclinic-api-gateway/.../static/scripts/` (or `spring-petclinic-ui`
  if present).

## 1. Sync + confirm modal

1. Open petclinic project → Sync.
2. First analysis modal (**Languages**) **Frontend** block shows AngularJS /
   javascript under the UI root with **frontend** mark and `angularjs-ui`
   parser status **available**.
3. Confirm → start analysis.

**Expect:** analysis run includes `angularjs-ui`; overall run succeeds even if
UI extract were to fail (then status failed + empty Graph UI).

## 2. Graph UI overview

1. Menu → **Graph UI**.
2. Overview lists **≥3** declared **URL-bearing, non-abstract** states/routes
   (e.g. welcome, owners, vets — not abstract `app` parent).
3. Frames non-overlapping; +/-/fit still work (unchanged `020` chrome).

## 3. Drill + API bind

1. Enter **Owners** (or equivalent).
2. Inspector shows structure; at least one **screen/controller** UI→API
   association (e.g. `GET …/api/customer/owners`) — joined or unresolved hint.

## 4. Graph view → Graph UI

1. Open **Graph view**; select the **API Gateway** service linked via
   `binds_service`.
2. Inspector **Graph UI** action opens Graph UI.
3. Select an unrelated service (e.g. DB) → action hidden/disabled.

## 5. React regression

On ODS portal React dogfood: Graph UI still populated via `react-ui` (no
regression vs `020`).

## 6. Empty / non-AngularJS

Project without AngularJS (and without React UI): Graph UI empty state clear.

## API smoke (optional)

```bash
# Replace PROJECT_ID with petclinic id
curl -s "http://localhost:8080/api/v1/projects/PROJECT_ID/graph/ui" | head
curl -s "http://localhost:8080/api/v1/projects/PROJECT_ID/analysis/language-report/latest" | head
```

## Related contracts

- [detector-frontend-angularjs.md](./contracts/detector-frontend-angularjs.md)
- [ingest-angularjs-ui.md](./contracts/ingest-angularjs-ui.md)
- [native-ui-tree-angularjs.example.json](./contracts/native-ui-tree-angularjs.example.json)
  (also `ods-help/requirements/json-model/native-ui-tree-angularjs.example.json`)
- Schema (shared): `../020-ui-landscape-from-code/contracts/native-ui-tree.schema.json`
