# Detector: frontend-ui artifact (020)

**Spec**: [spec.md](./spec.md)  
**Base**: `specs/009-system-landscape/contracts/detector-artifacts.md`  
**Research**: [research.md](../research.md) R2

## Artifact entry

| Field | Value |
|-------|--------|
| `artifact_type` | `frontend-ui` |
| `parser_id` | `react-ui` when DoD React/TS root matched; else null |
| `parser_status` | via `ParserRegistryService` (+ failed carryover) |
| `file_count` | count of relevant UI source files under root(s) |
| `sample_paths` | up to 5 paths (e.g. `frontend/package.json`, `frontend/src/main.tsx`) |

## Detection heuristics (DoD)

Match a **React/TS SPA root** when most of:

- directory with `package.json` listing `react` (and typically `react-dom`);
- presence of React Router or route table file (`src/app/router.tsx`, etc.);
- entry such as `src/main.tsx` / `src/index.tsx`;
- optional: Vite/Webpack frontend config.

Do **not** treat pure backend Node packages as frontend-ui.

Multiple roots → aggregate `file_count` / samples; parser still one `react-ui`
spawn (native model may contain multiple `apps[]`).

## Orchestrator

Spawn `react-ui` from `artifacts[]` when `artifact_type=frontend-ui` and
`parser_status=available` (same rules as other artifact parsers).

## Modal window 1 (LanguagesConfirmModal)

Extend dialog with a **Frontend** section (in addition to Languages + System
artifacts):

1. Frontend language(s) **path-scoped under SPA root(s)** matched by
   `frontend-ui`, each with badge **frontend**. Do **not** reuse an unmarked
   global `typescript`/`javascript` row from the whole monorepo as the Frontend
   list (FR-017).
2. UI parser row: `react-ui` + `parser_status` badge (available / missing / failed).

Trigger window 1 unchanged: languages **or** artifacts non-empty (including
`frontend-ui`).

i18n: add en/ru keys for section title and badges (no hard-coded strings).
