# Contract: Docs tree + AGENT.md conventions (015)

**Aligned with**: `prompts/docs-agent-prompt.md`, [spec.md](../spec.md) §FR-011–016

## Tree

- Mirror system-layer hierarchy; folder = architecturally significant container.
- Main file: `spec-{slug}.md` (not `README.md`).
- Root: `spec-{project-name}.md` from `project.name` → repo name → safe slug.
- Thematic files only when ES evidence exists (`contracts/`, `messaging/`, …).

## AGENT.md

- Owned by ODS; seeded on import; re-rendered on Download prompt.
- Contains rendered placeholders from product template.
- Included later in export-pack; agent MUST NOT overwrite.

## Mandatory sections in each `spec-*.md`

1. Purpose  
2. Composition  
3. Operation → **Schema** (fenced Mermaid for this node)

## Name / link consistency

Same ES canonical names in prose, Schema, and API/Kafka/gRPC/HTTP sections when
evidence exists; GAP/UNKNOWN otherwise; do not invent protocols.

## Write modes

| Mode | Target |
|------|--------|
| `overwrite` (default) | `docs/{projectId}/…` |
| `versioned` | `docs/{projectId}/_generations/{DOCS_GENERATION_ID}/…` |

Missing `DOCS_GENERATION_ID` when versioned → agent stops with error (prompt rule).
