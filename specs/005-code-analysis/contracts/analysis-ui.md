# UI-contracts: confirmation of the analysis after sync

**Spec**: [spec.md]
**User: `specs/003-portal-mvp` (expansion of WorkspacePage / post-sync flow)
**API**: [openapi-analysis.yaml](./openapi-analysis.yaml)

## Trigger

After the transition `sync_status` → `success` | `partial` (sync completed, WC available):

1. Backend has already run Language Detector (automatically).
2. Frontend asks for `GET .../analysis/language-report/latest`.
3. If the report has  to show **window 1** when `languages.length > 0` **or** `artifacts.length > 0`. If both arrays are empty  toast no languages/artifacts analyzed, models are not to be shown.

Parser doesn't start until 2:00 PM.

## Window 1  Project languages and artifacts

**Component:** `LanguagesConfirmModal`
**Extension (`009`) **: see `specs/009-system-landscape/contracts/detector-artifacts.md`

| The element | The behavior |
|---------|-----------|
| Title | Languages and artifacts of the project |
| The language section | `languages[]` from the report, order = API (file_count ↓) |
| The artifacts section | `artifacts[]`  summary to one line on `artifact_type` |
| The line of the artifact | The human type, `file_count`, `sample_paths[0]`, badge; `bus` → one line of RabbitMQ/Kafka by `parser_id` |
| List of languages | language, `file_count`, example of path, parser status badge |
| Badge `available` | Parser is available |
| Badge `missing` | Parser not installed |
| Badge `failed` | Most recent result for that parser failed; a later success clears it |
| The light of novelty | Only in the first ** not** report: new language  green (`available`) / red (`missing`) |
| Continue | Close window 1 → download change set → window 2 |
| Othemany | close; do not run the analysis |

## Window 2  Changes in the code

**Component:** `ChangesConfirmModal`

| The element | The behavior |
|---------|-----------|
| Title | Code changes |
| Sections | Added / Changed / Deleted (path); empty sections to hide |
| The first analysis | All language files in the Section will be analyzed (or a complete list) |
| Continue | `POST .../analysis/runs` → poll status → toast success/error |
| Othemany | close; the previous results of the analysis are kept |

## Polling of the drive-by

After POST  `GET .../analysis/runs/{runId}` every 2 s, until `status` ∈
`pending`, `running`. End of story: `success` | `partial` | `failed`.

The button is  sync/analysis disabled Poka `sync_status=running` ili `analysis` running.

## Messages (portal i18n)

| Code / situation | The text |
|----------------|-------|
| `analysis_in_progress` | Analysis is already being done |
| run `failed` | Analysis ended with an error + `last_error_message` |
| run `partial` | Analysis partially completed: part of the parser is unavailable or ended with an error |
| run `success` | Analysis is complete |
| No languages | No supported languages for analysis in the project |

## Not included

- Visualization of the graph (`006`)
- Manually run the analysis without sync (post-MVP)
