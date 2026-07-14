# Canonical Edge Types — расширение 008

**Спека**: [../spec.md](../spec.md)  
**Data model**: [../data-model.md](../data-model.md)

## EdgeType после 008

Значения code-слоя (backend `domain/graph-edge.ts` + `isEdgeType`):

| type | Источник | MVP 008 |
|------|----------|---------|
| `imports` | symbols.refs / v1 | как `006` |
| `exports` | symbols.refs / v1 | как `006` |
| `inherits` | symbols.refs / v1 | как `006` |
| `implements` | symbols.refs / v1 | как `006` |
| `calls` | usages[] v2 | **MUST** extract+ingest |
| `injects` | usages[] v2 (C#) | **MUST** extract+ingest |
| `references` | — | задел; ingest MAY ignore |
| `contains` | — | как `006` (если появится) |

## `injects`

- **Семантика:** класс/тип-потребитель → тип параметра конструктора (эвристика DI).
- **Native:** `usages[].type = "injects"`, обычно `from` = class qn, `to` = interface/class qn.
- **Канон:** `GraphEdge.type = "injects"` (отдельный тип, не `references`).

## `metadata.layer`

При upsert узлов и рёбер ingest symbols после включения `008`:

```json
"metadata": { "layer": "code", "...": "прочие ключи сохраняются" }
```

Документы без `layer` (legacy) допустимы для чтения.

## Согласование со схемами

- Черновик `ods-help/requirements/json-model/canonical-edge-code.schema.json` —
  при implement добавить `injects` в enum `type` и обновить
  `implementation_note`.
- OpenAPI `006`/`007`: `GraphEdge.type` уже `string` — изменений API не
  требуется; при желании — пример `calls`/`injects` в описании.
