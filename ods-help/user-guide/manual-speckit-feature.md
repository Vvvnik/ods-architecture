# Manual: Spec Kit feature lifecycle

End-to-end operator guide for adding **any** ODS feature with Spec Kit
(`/speckit-*`), from optional draft through closed SpecKit docs and handoff
to the next feature.

**Worked example**: `027-ai-graph-from-wc` (draft → closed SpecKit).  
**Pilot user guide**: [`user-guide.md`](./user-guide.md).  
**Command cheat sheet**: [`commands.md`](./commands.md).  
**Sources of truth**: `.specify/memory/constitution.md`,
`.cursor/rules/specify-rules.mdc`, and the active feature under `specs/`.

Language: chat with the agent may be Russian; **all** SpecKit artifacts
(`specs/**`, constitution, `ods-help/**`, commits that land in the repo) stay
**English**.

---

## Before you start

1. Read constitution (`.specify/memory/constitution.md`) and vision boundaries
   (`specs/001-ods-vision/spec.md`) — scope changes that cross product
   boundaries go through `001` first.
2. Use **Agent** mode in Cursor for SpecKit skills (Ask mode cannot write
   specs or code).
3. Know the **active** feature: `.specify/feature.json` → `feature_directory`
   (e.g. `specs/027-ai-graph-from-wc`).
4. Prefer a dedicated git branch named like the feature folder slug
   (e.g. `027-ai-graph-from-wc`).
5. Do **not** treat `ods-help/requirements/` as canonical — drafts feed
   specify; only `specs/**/spec.md` is requirements truth.

| Need | Where |
|------|--------|
| SDD rules | `.specify/memory/constitution.md` |
| Vision / roadmap | `specs/001-ods-vision/spec.md` |
| Active feature pointer | `.specify/feature.json` |
| Agent plan link | `.cursor/rules/specify-rules.mdc` (`SPECKIT` block) |
| Draft ideas | `ods-help/requirements/*-draft.md` |
| Slash commands | [`commands.md`](./commands.md) |

---

## Pipeline at a glance

```text
[0 draft] → specify → clarify ★ → [checklist] → plan → tasks → analyze ★
        → implement → test/smoke → converge ⇄ implement → close-out → next feature
```

★ **Gate with human agreement** — do not auto-advance past Clarify or Analyze
without an explicit OK on answers / findings (see §2 and §5).

Typical order matches constitution: **aligned artifacts first, then code**.

---

## 0. Optional draft

When the idea is still fuzzy, write a short draft under
`ods-help/requirements/`:

- Name: `{NNN}-{slug}-draft.md` (e.g. `027-ai-graph-from-wc-draft.md`).
- Include: problem, goal, dependencies, out-of-scope, open questions.
- Mark status (`draft` / later `historical → specs/…`).

Drafts are input for `/speckit-specify`. They **must not** replace
`specs/**/spec.md`.

**027 example**: `ods-help/requirements/027-ai-graph-from-wc-draft.md` →
feature folder `specs/027-ai-graph-from-wc/`.

---

## 1. Specify (`/speckit-specify`)

Create or update the feature specification from a natural-language description
(and optional draft).

**You / agent:**

1. Run `/speckit-specify` with a clear feature description (paste draft
   highlights if useful).
2. Expect: branch + folder `specs/NNN-slug/`, `spec.md`,
   `.specify/feature.json` updated, quality checklist under
   `checklists/` when generated.
3. Confirm `feature.json` points at the new directory.
4. Usually a hook refreshes the SPECKIT plan link in
   `specify-rules.mdc`; if missing after later plan, run
   `/speckit-agent-context-update` (listed in `commands.md` as
   `/speckit.agent-context.update`).

**Stop condition:** `spec.md` has testable user stories, FR/SC, and explicit
out-of-scope. Gaps → Clarify next (do not jump to plan).

---

## 2. Clarify (`/speckit-clarify`) — agree every answer

Resolve ambiguities **before** plan. Skill asks up to **5** high-impact
questions (one at a time), recommends an option, then writes each accepted
`Q → A` into `spec.md` (`## Clarifications` + related FR/stories/edges).

### Agreement gate (required)

1. **Read every question** and the agent’s recommendation.
2. **Answer explicitly** (option letter, short phrase, or “yes” /
   “recommended” only when you truly accept the recommendation).
3. **Work through the full set** — do not skip mid-session unless you
   consciously defer remaining topics (agent should list Deferred items).
4. After the session, **review the updated `spec.md`**: Clarifications
   session bullets and the sections they changed (FR, stories, edge cases).
5. **Gate:** say clearly that clarifications are **agreed** (or request
   edits) **before** `/speckit-plan`. Unagreed answers must not drive the
   plan.

Skipping Clarify is only for explicit spikes; expect rework risk.

**027 example:** clarify locked decisions (dual prompts, seed
`AGENT-CODE.md` after first parser success, concurrent docs/code jobs,
empty-graph fail, WC size cap, etc.) before plan.

Optional: `/speckit-checklist` for a report-only quality checklist — not a
substitute for Clarify agreement.

---

## 3. Plan (`/speckit-plan`)

After Clarify is agreed:

1. `/speckit-plan` → `plan.md` plus design docs as needed
   (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`).
2. Confirm SPECKIT block in `specify-rules.mdc` points at this feature’s
   `plan.md`.
3. If vision/boundaries changed, align `001` **before** treating the plan
   as final (constitution III).

---

## 4. Tasks (`/speckit-tasks`)

1. `/speckit-tasks` → dependency-ordered `tasks.md` (phases, `[P]`, story
   mapping).
2. Skim for missing FR/SC coverage and impossible orderings; fix via
   tasks/plan/spec edits **before** Analyze if obvious.

Optional: `/speckit-taskstoissues` only when you want GitHub Issues from
task lines (multi-person boards). Not required for a solo Cursor loop.

---

## 5. Analyze (`/speckit-analyze`) — review and agree

Read-only consistency pass across `spec.md` + `plan.md` + `tasks.md`
(+ constitution). Produces a findings report; does **not** auto-edit.

### Agreement gate (required)

1. Run `/speckit-analyze` only after `tasks.md` exists.
2. **Read the full report** (CRITICAL / HIGH first; constitution conflicts
   are non-negotiable).
3. Decide remediation with the agent: which findings to fix in which
   artifact (spec vs plan vs tasks). Analyze itself stays read-only until
   you approve follow-up edits.
4. Apply agreed fixes (manual or a follow-up Agent turn), then **re-run
   Analyze** if CRITICAL/HIGH remained.
5. **Gate:** explicitly **agree** that the triad is consistent enough to
   implement — **before** `/speckit-implement`. Do not treat “report
   generated” as approval.

---

## 6. Implement (`/speckit-implement`)

1. Ensure checklists under `checklists/` are not blocking incomplete items
   the skill requires (or complete them deliberately).
2. `/speckit-implement` executes open tasks in `tasks.md` order.
3. Follow the feature `quickstart.md` and any contracts while coding.
4. Keep commits/PRs scoped; no foreign product/repo names in tracked files
   (see `.cursor/rules/no-foreign-repo-names.mdc`).

Implement may span several sessions. Prefer finishing a user-story
checkpoint before starting unrelated polish.

---

## 7. Test and verify

Use whatever the feature plan/quickstart defines. Common ODS pattern:

| Layer | Typical command / action |
|-------|---------------------------|
| Unit / API | `backend` / `frontend` package scripts from plan |
| Compose dogfood | `docker compose … --profile full`; portal `:8080` |
| Feature smoke | `specs/<feature>/quickstart.md` checklist |
| Optional E2E | `frontend` Playwright when the feature touches UI |

Check off quickstart / SC items only when evidence exists
(`skipIf` without fixture ≠ PASS).

**027 example:** parser analysis first → dual prompts → external agent on
`AGENT-CODE.md` → Graph View **Built by AI**; negative gates for empty/
invalid Canon; docs regression still via `AGENT-DOC.md`
([`manual-docs-create.md`](./manual-docs-create.md)).

---

## 8. Converge loop (`/speckit-converge`)

After an implement pass:

1. `/speckit-converge` compares codebase to spec/plan/tasks and **appends**
   remaining work as a new Convergence phase in `tasks.md` (or reports
   clean and leaves tasks unchanged).
2. If new tasks appeared → `/speckit-implement` again.
3. Repeat until converge reports **no remaining gaps**.

Never skip converge on a feature you intend to mark closed.

---

## 9. Close-out (SpecKit docs reflect done)

Before calling the feature finished:

- [ ] All tasks in `tasks.md` checked (including Convergence phases)
- [ ] `spec.md` status/date reflects closed / shipped reality
- [ ] `plan.md` / `research.md` / contracts still match what shipped
- [ ] `quickstart.md` success checklist verified on real smoke
- [ ] Feature checklist(s) under `checklists/` consistent with the final spec
- [ ] Draft under `ods-help/requirements/` marked historical → `specs/…`
  if one existed
- [ ] Constitution / `001` roadmap updated **only if** the feature changed
  vision boundaries or “next step” notes
- [ ] No silent scope left only in chat — FR/out-of-scope match the product

Optional: PR via team process; keep SpecKit English in PR body that lands
in the repo.

---

## 10. Handoff to the next feature

1. Leave the closed feature folder intact under `specs/` (history + truth).
2. Start the next idea with §0 draft and/or `/speckit-specify` on a **new**
   slug; `feature.json` will move to the new `feature_directory`.
3. Run `/speckit-agent-context-update` (or `/speckit.agent-context.update`)
   if the SPECKIT plan path did not refresh.
4. Do **not** reopen a closed feature for unrelated work — new folder /
   surgical child edit per constitution I–III.

---

## Worked walkthrough: `027-ai-graph-from-wc`

| Step | What happened |
|------|----------------|
| Draft | `ods-help/requirements/027-ai-graph-from-wc-draft.md` (S1 AI graph from WC) |
| Specify | `specs/027-ai-graph-from-wc/spec.md` |
| Clarify ★ | Locked dual prompts, seed/gates, Status scope, provenance badge |
| Plan / tasks | `plan.md`, contracts, `tasks.md` phases US1–US4 |
| Analyze ★ | Triad consistency before code |
| Implement | AiJob `graph_from_wc`, `AGENT-CODE.md`, ingest gates, UI badge |
| Test | Compose dogfood 2026-08-02; quickstart SC checklist |
| Converge | Remaining gaps appended then closed |
| Close-out | Spec status Closed; draft marked historical |

---

## Anti-patterns

| Avoid | Do instead |
|-------|------------|
| Plan/implement on unagreed Clarify answers | Gate after §2 |
| Implement right after Analyze report | Agree remediations; re-analyze if needed |
| Coding from draft only | Specify → … → tasks |
| Skipping converge | Converge ⇄ implement until clean |
| Expanding child scope without `001` | Vision first, then child FR |
| Foreign repo/product names in specs/tests | Generic labels / ODS fixtures |

---

## Related

| File | Role |
|------|------|
| [`commands.md`](./commands.md) | Slash command list + stack smoke |
| [`manual-docs-create.md`](./manual-docs-create.md) | Operator docs + AI graph prompts (015 / 027) |
| `.specify/memory/constitution.md` | SDD principles |
| `specs/001-ods-vision/spec.md` | Vision and boundaries |
| `specs/027-ai-graph-from-wc/` | Closed reference feature |
| `.cursor/skills/speckit-*/SKILL.md` | Skill details for each command |
