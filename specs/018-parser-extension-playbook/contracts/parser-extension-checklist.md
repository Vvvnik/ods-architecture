# Parser extension checklist-module

**Spec**: [spec.md](../spec.md) (FR-001–FR-003)  
**Normative** for any new language- or artifact-module after `018`.  
Skip item — only with explicit justification in spec/research new feature.

Related contracts: envelope and CLI — `specs/005-code-analysis/contracts/`;
canon code — `008`; system artifacts — `009`.

---

## 0. Pre-code decision (mandatory)

| Question | Language | Artifact | Not a parser |
|--------|----------|----------|-----------|
| What do we detect? | extensions / shebang / language manifest | basename / glob / content-hints | noise (lockfiles, wrappers) |
| Source spawn? | report `languages[]` + status available | report `artifacts[]` + parser_id | — |
| Canon | code-layer | system-layer | do not create a module |

**Rule:** «service structure / config / contract / HTTP» → **artifact**,
even if files are of the same language. Symbols language — separate module.
Mixing is forbidden symbols + HTTP/bus in report and

---

## 1. Spec and contracts

- [ ] Roadmap entry `001` (number, status, reference)
- [ ] Child spec `specs/0NN-*/` with boundaries DoD
- [ ] Contract native-module model (+ example)
- [ ] On new NodeType/EdgeType — update canon-contracts (`008` / `009`);
  do not invent types only in ingest
- [ ] Envelope — only wrapper `005`; content `model` validates ingest

## 2. Detection

- [ ] Language: extension rules / shebang / manifests
- [ ] Artifact: rules in the artifact detector configuration
- [ ] Hit in language report: `parser_id`, status
  (available / not installed / error)
- [ ] Increment: change-set can select module files

## 3. CLI-module

- [ ] Module catalog with manifest (id, languages, schema_version, command,
  timeout, input/output description) per contract `005`
- [ ] Entry CLI: single argv-contract `005`; exit 0 + valid envelope
- [ ] README module (purpose, native model, reference)
- [ ] Project module registry entry (status table)
- [ ] Shared code — only via explicit shared at real reuse

CLI **not** requires the orchestrator to know the structure of `model`.

## 4. Ingest → canon

- [ ] Adapter ingest for `parser_id`
- [ ] Registration in platform adapter registry
- [ ] For artifact — participation in paths/filters artifact-parsers
- [ ] Idempotent id nodes/edges; increment cleans obsolete by path
- [ ] Adapter error → error record ingest, does not fail the entire run

## 5. Orchestration

- [ ] Registry picks up the manifest from the module catalog
- [ ] Order spawn: languages by `file_count`; artifacts — compose first,
  then by count (as in the platform)
- [ ] Missing does not block other modules

## 6. Delivery runtime

- [ ] Module available to the orchestrator in pilot delivery (image / container)
- [ ] Module build/dependencies included in image delivery if required
- [ ] Heavy runtime (JDK and similar) — explicitly in plan

## 7. Fixtures and acceptance

- [ ] Fixture and/or external standard (dogfood)
- [ ] Unit: extract + schema native model
- [ ] Integration: spawn → envelope → ingest → graph / view
- [ ] Negative: module disabled → missing, remaining analysis modules ( ok
- [ ] Audit reuse: no second orchestrator; no canon replica

## 8. UI

- [ ] Modal/Report shows module status (already in `005`/`007`)
- [ ] New signatures inspector — only if canonical is actually extended

## 9. Pilot documentation

- [ ] If needed — briefly in user-guide (not instead of specs)
- [ ] Module table in catalog parsers updated

---

## Anti-patterns

- Single language-all-in-one module (symbols + HTTP + bus)
- Change envelope orchestrator under native model
- New canon types without contract
- Read `missing` detector bug
- Pull wrappers (`mvnw`/`gradlew`) and shell «just in case in code-graph

---

## Post-use `018`

New language/artifact: subject extraction spec + **this** checklist in tasks.
Separate meta-the 'how to add parsers' spec is no longer needed.
