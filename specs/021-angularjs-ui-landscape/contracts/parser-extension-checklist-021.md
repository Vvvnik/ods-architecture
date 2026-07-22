# Parser extension checklist — 021 angularjs-ui

Track against `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`.

| § | Item | 021 status (2026-07-22) |
|---|------|-------------------------|
| 0 | Artifact vs language | ✅ `frontend-angularjs` → UI layer |
| 1 | Spec + contracts | ✅ feature folder; reuse `020` schemas |
| 2 | Detection | ✅ heuristics; not React / not Angular 2+ |
| 3 | CLI module | ✅ `parsers/angularjs-ui/` |
| 4 | Ingest | ✅ `angularjs-ui.ingest.ts` + registry |
| 5 | Orchestration | ✅ spawn from artifacts; failure non-fatal |
| 6 | Delivery | ✅ module beside other parsers (backend image) |
| 7 | Fixtures / dogfood | ✅ unit extract + ingest; React regression tests |
| 8 | Docs | ✅ module README; quickstart; English artifacts |

Skip justification: none required beyond reusing `020` Graph UI / schemas
(explicit non-goal: no second Graph UI surface).
