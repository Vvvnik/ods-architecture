# Quickstart: S1 — AI graph from working copy (027)

**Spec**: [spec.md](./spec.md)  
**Contracts**: [contracts/](./contracts/)  
**Stack**: Docker Compose `--profile full` (portal `:8080`)

## Prerequisites

- ODS stack up (`docker/` compose full profile).
- ODS-owned fixture or demo WC importable as a project (no foreign path
  hardcodes in tracked notes).
- External agent available (Cursor / similar) for the download → REST loop.

## 1. Parser path still first

1. Import fixture project (cold tree).
2. Run analysis (parsers).
3. Open Graph View — landscape visible; badge **Built by parsers**.

**Expect:** No AI on import/sync; docs tree has `AGENT-DOC.md` (not
`AGENT.md`). If an old volume still has `AGENT.md`, open Documentation once
and confirm rename to `AGENT-DOC.md`.

## 2. Dual prompts

1. Open Documentation / prompt panel after successful analysis.
2. Confirm **two** download controls (docs + code).
3. Docs download → file `AGENT-DOC.md`; AiJob `docs_from_es` running.
4. After parser success (before any code download) → `AGENT-CODE.md` is
   **present** in the docs tree (seed; empty `CODE_JOB_ID`).
5. Code download → `AGENT-CODE.md` **re-rendered**; AiJob `graph_from_wc`
   running; placeholders include live `CODE_JOB_ID` and new
   `ANALYSIS_RUN_ID`.

## 3. AI rebuild (happy path)

1. Run external agent on `AGENT-CODE.md` (prompt requires parser-parity
   Code / System / UI depth — not System-only).
2. Agent lists/reads WC via job-scoped APIs; posts Canon ingest batches;
   completes `succeeded`.
3. Refresh Graph View — landscape from AI run; badge **Built by AI**.
   If the WC has a frontend, expect `ui_route` / `ui_screen` (not a bare
   `ui_app`); otherwise Graph UI shows empty landscape.
4. Prior parser graph replaced only after success.

## 4. Gates (negative)

1. Start code-download; ingest one invalid/unknown kind → job fails;
   Graph View still shows previous graph; badge unchanged.
2. Or complete with zero nodes → job failed; previous graph intact.

## 5. Status scope

1. Mark a subtree `not_needed`.
2. Re-run parser analysis and/or AI rebuild.
3. Those paths absent from graph inventory; tree still lists them after
   sync.
4. Status picker offers only `auto_found` / `needed` / `not_needed`.

## 6. Concurrency smoke

1. Start docs-download (docs job running).
2. Start code-download without waiting for docs complete.
3. Both jobs may be `running`; docs still bound to its
   `analysis_run_id`.

## 7. Docs regression

1. Complete a docs agent loop with `AGENT-DOC.md`.
2. Confirm Markdown docs still generate; Export (if used) packs
   `AGENT-DOC.md`.

## Success checklist

- [x] SC-001 dual prompts without AI on import/sync  
- [x] SC-002 AI landscape + AI badge on fixture  
- [x] SC-003 failed AI leaves prior graph  
- [x] SC-004 `not_needed` omitted from graphs  
- [x] SC-005 docs path with `AGENT-DOC.md`  
- [x] SC-006 badge distinguishable without Status change  

Validated on Compose dogfood 2026-08-02 (fixture project; external agent
`graph_from_wc` succeeded with System/Code/UI Canon; Graph View badge AI).
