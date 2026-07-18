# Implementation Plan: Parser extension playbook + Java MVP (018)

**Branch**: `018-parser-extension-playbook` | **Date**: 2026-07-19 |
**Spec**: [spec.md](./spec.md)

**Input**: `specs/018-parser-extension-playbook/spec.md` — **CP-A** нормативный
чеклист расширения парсеров + **CP-B** language-модуль `java` (production
`src/main/java`, top-level типы, FQN-пакеты). Clarifications 2026-07-19.
Spring HTTP / shell symbols — вне DoD.

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 14
- `specs/005-code-analysis/` — envelope, registry, оркестратор, статусы
- `specs/006-project-graph/` + `008` — канон code / symbols ingest
- `specs/013-api-routes-from-code/` — эталон добавления сменного модуля
- Контракт шаблона уже в [contracts/parser-extension-checklist.md](./contracts/parser-extension-checklist.md)

## Summary

1. **CP-A:** чеклист уже канон; в tasks — явный проход пунктов при закрытии Java.
2. **CP-B:** CLI `parsers/java/` (**JavaParser + Maven** jar) → envelope
   `symbols[]` (schema 1) → reuse
   `createSymbolsModelIngestAdapter('java','java')`; фильтр spawn/extract
   `**/src/main/java/**`; детектор игнорирует `mvnw`/`gradlew`.
3. Пакет = `kind: namespace` (один узел на FQN, роль как csharp); на каждый
   `.java` — **`module`** (как все language-парсеры); тип =
   class/interface/enum top-level с `parent_qualified_name` = FQN пакета;
   parent resolve по qn в shared ingest.
4. Эталон CI: **java-symbols-demo** (MUST); dogfood SHOULD: petclinic.

## Technical Context

**Language/Version**: Java 17+ (CLI extract); TypeScript 5.x / Node 20
(backend ingest, detector); bash/`run.sh` entry как у csharp/python

**Primary Dependencies**: JavaParser (javaparser-core) + **Maven** для
сборки CLI; существующий symbols-model ingest; Vitest; Docker image —
JDK 17 для `mvn package` / `java -jar` (рядом с уже имеющимся .NET)

**Storage**: те же `ods-graph-nodes` / `ods-graph-edges` / envelopes;
`metadata.layer=code`; новых индексов нет

**Testing**: unit extract (package + top-level types; ignore nested/test);
unit detector wrappers; integration spawn→ingest→graph на fixture/petclinic;
негатив missing java

**Target Platform**: Docker Compose `--profile full`

**Project Type**: 1 language CLI parser + detector tweak + ingest register +
docs checklist (уже есть)

**Performance Goals**: petclinic ~десятки `.java` в main — полный прогон
модуля в таймауте registry (как прочие language-парсеры); SC-001/002

**Constraints**: только production paths; только top-level типы; FQN-пакеты
без сегментной иерархии; без calls/`008`; без Spring system; русский
артефакты; reuse оркестратора `005`; audit по чеклисту

**Scale/Scope**: 1 parser_id `java`; dogfood petclinic; Go/Kotlin/Spring HTTP —
follow-up по тому же чеклисту

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. FR в `018`, не раздувать `001` | ✅ |
| Scope в `001` (`018` перед `015`) | ✅ |
| Модульный CLI, не монолит backend | ✅ |
| Один канон ES | ✅ |
| Русский UI/артефакты | ✅ |
| Код после plan/tasks | ✅ |
| Без auth/RAG/docs продукта | ✅ |
| Playbook + Java в одной фиче (clarify) | ✅ |

**Post-design:** research + data-model + contracts + quickstart — нарушений нет.

## Project Structure

### Documentation (this feature)

```text
specs/018-parser-extension-playbook/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── parser-extension-checklist.md   # CP-A (уже есть)
│   ├── native-java-symbols.schema.json
│   ├── native-java-symbols.example.json
│   ├── detector-java-wrappers.md
│   └── ingest-java.md
└── tasks.md                            # /speckit-tasks
```

### Source Code

```text
parsers/java/                           # manifest, run.sh, Maven + JavaParser
├── manifest.json
├── README.md
├── run.sh
├── pom.xml
└── src/main/java/...                   # CLI entry + extract

backend/
├── src/services/language-detector.service.ts   # ignore mvnw/gradlew
├── src/services/change-set.service.ts          # optional: filter main/java для spawn
│   # (или фильтр только внутри parsers/java — см. research R4)
└── src/services/ingest/
    ├── adapters/java.ingest.ts                 # thin re-export symbols-model
    ├── adapters/symbols-model.ingest.ts        # parent resolve by qn (R3)
    └── ingest-registry.service.ts

backend/Dockerfile                        # JDK + build parsers/java
docker/fixtures/repos/                    # MUST: java-symbols-demo (CI SC-001/002)
```

**Structure Decision**: language-модуль как `python`/`csharp`; shared symbols
ingest; чеклист CP-A уже в contracts — не дублировать процесс в коде.

## Complexity Tracking

> Нет нарушений конституции, требующих таблицы.
