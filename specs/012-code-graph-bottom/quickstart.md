# Quickstart: check 012-code-graph-bottom

**Goal:** with system-cards fall into code to the sheet of the Canon for `ods-arch`,
without breaking system-viewing. Contracts are [contracts/](./contracts/).

## Prerequisites

1. Stack: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
2. Project **ods-arch** (`/repos/ods-arch`) imported sync + analysis
   completed; there is compose-services and code-graph.
3. For regression system — also `system-landscape-demo` (or system on ods-arch).

## 1. Regression system (SC-004)

1. "Graph view" → map System (frontend, backend, elasticsearch).
2. Log in `backend` → system-interior (not immediately classes).
3. Up / to the system — no errors.

## 2. Sign in code (SC-001, FR-013)

1. Focus `backend` (system) → in inspector **"In the code"**.
2. **Expectation:** `layer=code`; modules/files backend (not all frontend).
3. API: `GET .../graph/view?focus=<backendId>&layer=code` —
   `empty_reason` ≠ `no_related_code` (if the analysis of the rich).

## 3. To the bottom

1. Enter the module → types; if there are methods, another level.
2. Crumbs / "Up" bring back the ancestors.
3. A single click on a neighbor = inspector; "Log in" changes focus (including to
   a foreign component if the neighbor is outside).

## 4. Empty code (SC-003)

1. "Code" from `elasticsearch` (or service without path-match).
2. **Expectation:** empty state "linked code not found"; return to
   the system is possible.

## 5. Two components (SC-006)

1. Code-cut `frontend` and `backend` distinguishable (different knots / paths).
2. There is not one common dump of the entire project on both inputs.

## 6. From the analysis of (SC-007)

1. "Graph analysis" → select class/method → "Open on the diagram".
2. **Expectation:** focus on this code-node (`resolve_status=exact_code` or
   equivalent), not just the system map.
3. "In the analysis", the reverse is the same node.

## 7. Truncation

1. If necessary `max_nodes=20` wide code-focus → `truncated=true`
   + Russian banner; zoom does not load the rest.

## Run criteria

| SC | Check |
|----|----------|
| SC-001 | System → backend system → In the code → sheet |
| SC-002 | There is no complete "code-" project graph on the slice |
| SC-003 | elasticsearch / without code — empty |
| SC-004 | system-only the script is alive |
| SC-005 | no edit in the diagram |
| SC-006 | frontend ≠ backend slices |
| SC-007 | open-from-analysis → focus on code (`exact_code`) or explicit fallback |

## Don't check here

- New parsers / affiliation entry in ES
- Docs / RAG / auth
- Database hierarchy
