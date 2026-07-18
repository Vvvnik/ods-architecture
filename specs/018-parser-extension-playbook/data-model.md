# Data Model: 018-parser-extension-playbook

**Спека**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Канон остаётся в ES `ods-graph-nodes` / `ods-graph-edges`. Новых индексов и
NodeType/EdgeType **нет**.

## Entities (канон code)

### Файл (`kind: module`, `metadata.layer: code`) — MUST

Как typescript / python / csharp / cpp: **один `module` на каждый**
разобранный `.java`.

| Поле | Правило |
|------|---------|
| `name` | basename файла |
| `qualified_name` | путь относительно WC (как csharp) |
| `path` | тот же путь `.java` |
| `language` / `parser_id` | `java` |

### Пакет (`kind: namespace`, `metadata.layer: code`) — MUST

Роль как **namespace в csharp**. Уникальность DoD: **один узел на FQN**
(не плодить копию на каждый файл; csharp иногда дублирует — мы нет).

| Поле | Правило |
|------|---------|
| `id` | стабильный от parser_id + path + kind + qualified_name |
| `name` | последний сегмент FQN |
| `qualified_name` | FQN пакета |
| `path` | синтетический `java-package/<FQN-with-slashes>` |
| `language` / `parser_id` | `java` |

### Тип (`kind: class` \| `interface` \| `enum`) — MUST (top-level)

| Поле | Правило |
|------|---------|
| `name` | простое имя типа |
| `qualified_name` | `FQNпакета.Type` или `Type` (default package) |
| `path` | путь `.java` (тот же, что у module файла) |
| `parent_qualified_name` | FQN пакета (`namespace`) |
| `language` / `parser_id` | `java` |

Только **top-level**. Nested / anonymous / local — не эмитить.

## Relationships

| type | from → to | Когда |
|------|-----------|--------|
| parent_id / иерархия UI | package → type | через parent resolve (R3) |
| `contains` | MAY через refs | не обязательно, если parent_id выставлен |

Рёбра `calls` / `injects` — **не** в DoD `018`.

## Native envelope

См. [contracts/native-java-symbols.schema.json](./contracts/native-java-symbols.schema.json).

Логика:

```text
symbols[]:
  { kind: module, path: …/Foo.java, qualified_name: …/Foo.java }
  { kind: namespace, qualified_name: FQN, path: java-package/... }
  { kind: class|interface|enum, path: …/Foo.java,
    qualified_name, parent_qualified_name?: FQN }
```

`files_analyzed` в envelope — только реально разобранные main-пути.

## Validation

- Путь типа MUST match `**/src/main/java/**` (после фильтра CLI).
- Не эмитить nested/local/anonymous.
- Default package: тип без parent; namespace MAY опустить.
- Идемпотентный upsert по id в рамках `analysis_run_id`.
- Ошибка одного файла — skip/log; не валить весь CLI (best-effort, exit 0
  при частичном успехе — как принято в других modules; иначе failed только
  при тотальном крахе).

## Detector

Wrappers — [contracts/detector-java-wrappers.md](./contracts/detector-java-wrappers.md).
Language `java` уже в EXTENSION_LANGUAGE_MAP (`.java`).

## Ingest

[contracts/ingest-java.md](./contracts/ingest-java.md) — thin adapter + parent
qn fallback.
