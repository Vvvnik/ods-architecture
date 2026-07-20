# Contract: Scale acceptance (DoD)

**Spec**: [../spec.md](../spec.md) | **Clarify**: fixtures mandatory manual smoke;
walk-scope A; SC-003 measure; SC-005 large-repo max

## A. Automatic / fixture gate (`large-repo`)

Source: `docker/fixtures/repos/large-repo` (via
`setup-fixtures.sh --demo` / `setup-demo-repos.sh`). Landmark **≥1000 files**.

| Metric | Threshold / rule |
|---------|-----------------|
| Full cycle sync→detect→analysis→ingest | ≤ **15 min** (900 C) |
| Full WC walks cycle (SC-002) | ≤ **1** — gate **on large-repo** |
| Dangling edges in run | **0** |
| Incremental SC-003 | **Compulsory metering**: wall-clock analysis+ingest after ≤1% change ≥**40%** faster full **or** explicit `incremental_unavailable_reason` report |
| Graph UI SC-005 | The first page of wood/search **actual** graph large-repo < ~3 with; the goal is ≥10 000 knots guide, not a blocker |

Fix the duration table (see quickstart), including full vs
incremental lines.

### Policy `skipIf` (analyze remediation A1)

Integration tests T011 / T043 / T044 **MAY** do `skipIf` if
fixture `large-repo` missing surrounded by CI/agent.

- `skipIf` **≠** PASS at SC-001 / SC-002 / SC-003.
- To close DoD stage at skipped auto-gate operator **MUST** fill
  the corresponding rows in quickstart (**T047**) and, if necessary,
  confirm closing smoke (**T048** / §B).
- In the report / PR description **MUST** explicitly specify: `skipped: large-repo fixture
  missing` + link to the completed table (or smoke).

## B. Closing smoke (mandatory, without CI)

**Source:** local git-repository operator through `local_path`.
**Not** committing to ODS. **Not** CI.

### Checklist (copy to report)

- [ ] Project import (`local_path`) is successful
- [ ] Sync completed (`success` / `partial` an explanation)
- [ ] Language report received; artifacts/languages are meaningful
- [ ] Analysis run completed (`success` / `partial` transcript `parser_results`)
- [ ] During run visible progress: sync stage: on analysis — parser / N from M
- [ ] Graph summary: node_count / edge_count recorded
- [ ] The filter code/system/all and the page tree/search respond
- [ ] Fill in the table wall-clock (sync / detect / analysis / total)
- [ ] SC-003: line full vs incremental **or** reason of unavailability
- [ ] Standard **not** attached to `docker/fixtures` and git ODS

### DoD stage `010`

| Condition | Necessarily |
|---------|-------------|
| A. Fixture gates SC-001...SC-005/007 (for applicability) | Yes — auto PASS **or** (skipIf + completed table T047) |
| B. Closing smoke checklist completed and saved | yes |
| Parser CLI SDK (US7) | no (follow-up; tracker in tasks Notes) |
| Canvas | No (`011`) |

## C. Out of scope reminder

Parser CLI SDK — mandatory follow-up after closing A+B (FR-010).
