# Quickstart: проверка 018 (playbook + Java)

**Цель:** Java — `available` + code-узлы (FQN-пакеты и top-level типы из
`src/main/java`); wrappers не в shell; чеклист CP-A пройден в tasks.

**Эталоны:** CI — `java-symbols-demo`; dogfood SHOULD — petclinic.

Контракты: [contracts/](./contracts/).

## Предусловия

1. `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
   (образ с JDK + `mvn package` для `parsers/java`).
2. Импортирован **java-symbols-demo** и/или petclinic; sync + language report;
   модуль `java` → **available**.

## 1. Отчёт языков (SC-001, SC-003)

1. Открыть модалку/отчёт языков после sync (fixture или petclinic).
2. **Ожидание:** `java` — статус **доступен**.
3. **Ожидание (petclinic):** `mvnw` / `gradlew` **не** в shell как исходники.
4. API:  
   `GET /api/v1/projects/:id/analysis/language-report/latest`

## 2. Анализ → code-граф (SC-002)

1. Подтвердить анализ.
2. Code-слой / граф: есть **`module`** (файлы), **`namespace`** (FQN-пакеты)
   и **top-level типы** с `path` в `src/main/java` (как у csharp:
   module+namespace+class).
3. Типы из `src/test/java` и nested — **не** обязательны.
4. Автопроверка: integration на `java-symbols-demo` (tasks T018).

## 3. Изоляция (SC-004)

1. Убрать/сломать `parsers/java` (или симулировать missing).
2. Анализ → `java` missing; compose / другие available не валят прогон.

## 4. Чеклист CP-A (SC-005)

1. В `tasks.md` отмечен проход
   [parser-extension-checklist.md](./contracts/parser-extension-checklist.md).
2. Ссылки: `parsers/README.md` + `specs/005-code-analysis/quickstart.md`.
3. `parsers/README.md` — `java` **available** после implement.

## Не проверяем здесь

- Spring HTTP / Feign / Maven-as-services
- calls / usages `008`
- shell symbols-парсер
- docs / RAG / auth
