# Research: 018-parser-extension-playbook

**Дата**: 2026-07-19  
**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

## R1 — Extract: JavaParser CLI на **Maven** (не tree-sitter Node)

**Decision:** Модуль `parsers/java/` — небольшой **Java CLI** на
**JavaParser** (javaparser-core), сборка **Maven** (`parsers/java/pom.xml`
→ jar), entry `run.sh` → `java -jar` / classpath, контракт argv как `005`.
Без JavaSymbolSolver в MVP. Каталог исходников CLI:
`parsers/java/src/main/java/...` (имя артефакта вроде `ods-java-parser`).

**Rationale:** DoD — package + top-level class/interface/enum; JavaParser
даёт стабильный AST объявлений; паттерн поставки как `csharp` (toolchain в
образе). **Maven** — один фиксированный способ сборки (analyze U1; не
Gradle). Tree-sitter быстрее, но для MVP важнее предсказуемость package/type.

**Alternatives considered:** Gradle mini; tree-sitter-java (Node/native);
regex-only; полный javac/ECJ.

## R2 — Native model = symbols schema 1

**Decision:** Envelope `model` = `{ "symbols": [ ... ] }` совместим с
`008`/`native-symbols` v1; `schema_version: "1"` в manifest. Usages/calls —
не эмитить (вне DoD).

| kind | Когда |
|------|--------|
| `module` | **MUST** — один на каждый разобранный `.java` (как TS/Python/C#/C++) |
| `namespace` | FQN пакета (роль как csharp namespace; **один** узел на FQN) |
| `class` / `interface` / `enum` | top-level тип в compilation unit |

Тип: `qualified_name` = `package.Type` (или `Type` в default package);
`parent_qualified_name` = FQN пакета (если есть).

**Rationale:** reuse `createSymbolsModelIngestAdapter`; FR-005; FR-010 без
новых NodeType.

**Alternatives considered:** Отдельный native JSON только для Java; schema 2
с пустым usages.

## R3 — `module` + FQN-`namespace` + parent resolve по qn

**Decision:**

1. **`module` MUST** на каждый `.java` (path = relative WC; как csharp/TS).
2. **`namespace` MUST** на FQN пакета: стабильный `path` =
   `java-package/<FQN-with-slashes>` — **один** узел на FQN (csharp иногда
   дублирует namespace per-file; для Java DoD — без дублей).
3. Типы: `parent_qualified_name` = FQN пакета.
4. В `symbols-model.ingest`: fallback parent по уникальному
   `qualified_name`, если path-keyed miss (пакет на синтетическом path).

**Rationale:** Единообразие с language-парсерами + роль namespace как в
csharp; уникальный FQN удобнее для графа.

**Alternatives considered:** Только path без module; дублировать namespace
на каждый файл как csharp; сегментная иерархия `com`→`com.example`.

## R4 — Фильтр `src/main/java`

**Decision:** Парсер **сам** отбрасывает пути вне `**/src/main/java/**`
(и типичный generated: `**/target/generated-sources/**`,
`**/build/generated/**`). Оркестратор MAY по-прежнему передавать все `.java`
из change-set; CLI фильтрует. Детектор `file_count` языка **не обязан**
сужать до main (MAY оставить все `.java` в отчёте) — DoD канона = только main.

**Rationale:** Clarify production-only; минимальный diff оркестратора;
явный контракт в README модуля.

**Alternatives considered:** Фильтр только в `pathsForLanguage`; менять
language report counts.

## R5 — Wrappers `mvnw` / `gradlew`

**Decision:** В language-detector: basename ∈ `{mvnw, gradlew, mvnw.cmd,
gradlew.bat, mvnw.ps1, gradlew.ps1}` → **не** классифицировать как shell
(и не как другой язык). Прочие `.sh` — как сейчас (`shell` / missing).

**Rationale:** FR-007 / SC-003; petclinic `mvnw`.

**Alternatives considered:** Игнорировать все shell; artifact build-scripts.

## R6 — JDK в Docker-образе

**Decision:** В `backend/Dockerfile` установить **Temurin/OpenJDK 17**
(JRE+JDK достаточный для `javac`/запуска fat-jar или `java -cp`), собрать
`parsers/java` на build-stage или в том же stage как csharp `dotnet build`.
Dev compose уже mount’ит `parsers/`.

**Rationale:** Образ уже тащит .NET; JDK — осознанный аналог. Sidecar —
избыточен для MVP.

**Alternatives considered:** Sidecar container; только host-installed JDK в
dev; Graal native-image.

## R7 — Ingest registration

**Decision:** `java.ingest.ts` = `createSymbolsModelIngestAdapter('java',
'java')`; register в `registerBuiltinIngestAdapters`. Не добавлять в
`ARTIFACT_PARSER_IDS`.

**Rationale:** Language-модуль, не artifact; паттерн python/cpp.

## R8 — Фикстуры и petclinic

**Decision:** **Авто/CI DoD (SC-001/002):** fixture
`docker/fixtures/repos/java-symbols-demo/`. **Dogfood SHOULD:** petclinic
Git URL (T019). Nested/test в fixture — только как негатив «не попадают в
канон».

**Rationale:** SC после analyze C1; CI без сети к GitHub.

**Alternatives considered:** Только petclinic; только fixture без dogfood.

## R9 — CP-A checklist

**Decision:** Норматив уже в
[contracts/parser-extension-checklist.md](./contracts/parser-extension-checklist.md).
В tasks — чеклист-проход (галочки) как DoD CP-A; ссылка из `parsers/README.md`
и при необходимости `005` quickstart.

**Rationale:** FR-001–FR-003; не плодить второй документ процесса.
