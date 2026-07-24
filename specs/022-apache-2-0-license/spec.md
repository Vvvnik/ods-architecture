# Spec: repository license — Apache 2.0

**Feature**: `022-apache-2-0-license`

**Created**: 2026-07-23

**Status**: Approved

**Input**: decision on the license for the ODS code (fully open source vs. open-core).

## Context and decision

ODS is a knowledge portal for git repositories, fuel for AI agents; market
category "code knowledge graph for LLM agents" (comparable products: Potpie,
codegraph, Gortex, Augment Code, Sourcegraph).

**Decision: fully open source, Apache License 2.0.** Open-core (open core +
paid modules) was rejected — it requires legal separation of the codebase,
maintaining two code layers, and legal/DevRel resources that don't exist with
a single developer (bus factor 1, already flagged as a risk in the project's
architecture documentation).

**Market reference:** among agent-first competitors in this category (Potpie,
codegraph, Gortex), open source is the norm and part of go-to-market: trust
through transparency, organic growth via GitHub (example: codegraph hit
GitHub #2 on release day precisely because of being open source). A fully
closed model (like Augment's) requires marketing/sales resources that a
single developer also doesn't have.

**Monetization** under an open-source license — via service (managed hosting,
enterprise support/SLA, customization, paid integrations), not via closing
the code. Not blocked by the code itself being open.

## Separate finding: Elasticsearch license

Since version 7.11+, Elasticsearch is distributed not under Apache 2.0, but
under SSPL / Elastic License 2.0 (with AGPLv3 added as an option since 2024).

**Clarification (discussion with Vladimir, 2026-07-23):** SSPL is not
triggered by the mere fact of using ES as a dependency, but by providing ES's
functionality as a service to third parties:

- **Self-hosted** (the client deploys docker-compose themselves) — SSPL is
  not triggered; this is standard use of a dependency.
- **ODS as a managed/hosted SaaS offered under our name** — here SSPL kicks
  in: the entire service stack (management software, UI, API, hosting) must
  be open-sourced, not just the core.

The monetization model (self-hosted + support vs. managed SaaS) has not been
chosen yet — this is an open question, tracked separately. Migration to
OpenSearch is **out of scope** for this task and not urgent until the model
is decided.

**Fact recorded from the code (`docker/docker-compose.dev.yml`):** the
Elasticsearch image is `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`
(official image, version after 7.11 → SSPL/Elastic License 2.0, not Apache
2.0). No further action on this item is taken within this task.

The rest of the stack (Fastify, React, TanStack Query, CodeMirror 6, etc.) is
MIT-licensed, no conflicts with Apache 2.0.

## What changes

- Added a `LICENSE` file at the repository root — the full text of the
  Apache License 2.0.
- Added one line to `README.md`: `License: Apache 2.0 ([LICENSE](LICENSE))`
  right after the heading; the rest of the README is unchanged (maintained
  separately).
- Added the field `"license": "Apache-2.0"` to `backend/package.json` and
  `frontend/package.json`.
- NOTICE file not required: no third-party attribution obligations found in
  dependencies (see dependency audit, 23.07.2026).

## Out of scope

- Migration to OpenSearch or any changes to the docker configuration.
- Choosing a monetization model (self-hosted vs. managed SaaS).
- Legal consultation / formal audit of dependency licenses beyond what is
  listed above.
