# ods-architecture

Репозиторий для проектирования **ODS-платформы** (анализ кода, графы, RAG, портал, спецификации) с помощью **[GitHub Spec Kit](https://github.com/github/spec-kit)** — инструмента **Spec-Driven Development (SDD)**: от идеи → к спецификации → плану → задачам → коду через coding agent в Cursor.

Сейчас в репозитории — **инфраструктура Spec Kit**, **спецификации** в `specs/` и **MVP портала** (`backend/`, `frontend/`, Docker на `:8080`).

---

## Запуск MVP (портал :8080)

После `git clone` — из **корня репозитория**:

```bash
cp docker/.env.example docker/.env
./docker/fixtures/repos/setup-fixtures.sh
docker compose -f docker/docker-compose.dev.yml --profile full up -d
```

Портал: **http://localhost:8080** · импорт: `local_path` = `/repos/sample-project`

`setup-fixtures.sh` создаёт `.git` в `sample-project` (в git только файлы, без submodule). Демо Perf Bulk / Large Repo: `./docker/fixtures/repos/setup-fixtures.sh --demo`

**Полная инструкция:** [`ods-help/user-guide/commands-run-project.md`](ods-help/user-guide/commands-run-project.md)  
**Стек и архитектура MVP:** [`ods-help/user-guide/architecture.md`](ods-help/user-guide/architecture.md)  
Backlog и известные ограничения: [`ods-help/user-guide/later.md`](ods-help/user-guide/later.md)

---

## Что такое Spec Kit в этом проекте

Spec Kit добавляет в репозиторий:

1. **Шаблоны** артефактов: спецификация, план, задачи, конституция, чеклист.
2. **Bash-скрипты** для создания фич, проверки окружения и подготовки `plan.md` / `tasks.md`.
3. **Skills для Cursor** — команды `/speckit-constitution`, `/speckit-specify`, `/speckit-plan` и др.
4. **Workflow** полного цикла SDD с контрольными точками (gates) между этапами.
5. **Расширение agent-context** — автоматически подсказывает агенту путь к актуальному `plan.md`.

Установка выполнена через CLI `specify` (версия **0.11.9**), интеграция: **cursor-agent**, скрипты: **sh**.

---

## Структура репозитория

```
ods-architecture/
├── README.md                          ← этот файл
│
├── ods-help/                          ← ваши заметки и видение (не часть Spec Kit)
│   ├── text.md                        ← видение ODS-платформы, этапы, правила изменений
│   ├── setup-speckit-translate.md     ← лог установки Spec Kit (перевод setup-отчёта)
│   └── create-subagent-cursor.md      ← черновик/инструкция по созданию subagent в Cursor
│
├── specs/                             ← (создаётся при работе) артефакты фич
│   └── NNN-feature-name/              ← одна папка = одна фича (нумерация sequential)
│       ├── spec.md                    ← спецификация фичи
│       ├── plan.md                    ← план реализации
│       ├── tasks.md                   ← список задач для реализации
│       ├── research.md, data-model.md, …  ← доп. артефакты проектирования из `plan-template`
│       └── …
│
├── .cursor/                           ← интеграция с Cursor Agent
│   ├── rules/
│   │   └── specify-rules.mdc          ← правило Cursor; внутри блок <!-- SPECKIT START/END -->
│   │                                  ← agent-context пишет сюда путь к текущему `plan.md`
│   └── skills/                        ← skills = slash-команды Spec Kit в Cursor
│       ├── speckit-constitution/SKILL.md      ← /speckit-constitution — конституция (`constitution.md`)
│       ├── speckit-specify/SKILL.md           ← /speckit-specify — спецификация фичи (`spec.md`)
│       ├── speckit-clarify/SKILL.md           ← /speckit-clarify — уточняющие вопросы по `spec.md`
│       ├── speckit-plan/SKILL.md              ← /speckit-plan — план реализации (`plan.md`)
│       ├── speckit-checklist/SKILL.md         ← /speckit-checklist — чеклист качества спецификации
│       ├── speckit-tasks/SKILL.md             ← /speckit-tasks — список задач (`tasks.md`)
│       ├── speckit-analyze/SKILL.md           ← /speckit-analyze — согласованность `spec.md` / `plan.md` / `tasks.md`
│       ├── speckit-implement/SKILL.md         ← /speckit-implement — выполнение задач из `tasks.md`
│       ├── speckit-converge/SKILL.md          ← /speckit-converge — добор недостающих задач в `tasks.md`
│       ├── speckit-taskstoissues/SKILL.md     ← /speckit-taskstoissues — задачи из `tasks.md` → GitHub Issues
│       └── speckit-agent-context-update/SKILL.md  ← обновление блока SPECKIT в context-файле
│
└── .specify/                          ← ядро Spec Kit (конфиг, шаблоны, скрипты, workflow)
    ├── integration.json               ← какая интеграция установлена (cursor-agent), версия
    ├── init-options.json              ← параметры `specify init` (ai, script, numbering, version)
    ├── extensions.yml                 ← включённые extensions и hooks (after_specify, after_plan)
    │
    ├── integrations/                  ← манифесты установленных пакетов (хеши файлов)
    │   ├── cursor-agent.manifest.json ← skills в .cursor/skills/
    │   └── speckit.manifest.json      ← scripts + templates в .specify/
    │
    ├── memory/
    │   └── constitution.md            ← конституция проекта (`constitution.md`; заполнить через /speckit-constitution)
    │
    ├── templates/                     ← шаблоны, из которых skills генерируют артефакты
    │   ├── constitution-template.md
    │   ├── spec-template.md
    │   ├── plan-template.md
    │   ├── tasks-template.md
    │   └── checklist-template.md
    │
    ├── scripts/bash/                  ← вспомогательные shell-скрипты для skills
    │   ├── common.sh                  ← общие функции
    │   ├── check-prerequisites.sh     ← проверка предварительных условий перед этапами
    │   ├── create-new-feature.sh      ← создание ветки и папки specs/NNN-name/
    │   ├── setup-plan.sh              ← подготовка `plan.md` из шаблона
    │   └── setup-tasks.sh             ← подготовка `tasks.md` из шаблона
    │
    ├── workflows/
    │   ├── workflow-registry.json     ← реестр workflow (здесь: speckit)
    │   └── speckit/
    │       └── workflow.yml           ← цепочка: спецификация → gate → план → gate → задачи → реализация
    │
    └── extensions/
        ├── .registry                  ← служебный реестр extensions
        └── agent-context/             ← расширение: синхронизация контекста coding agent
            ├── extension.yml
            ├── agent-context-config.yml   ← какой файл править (.cursor/rules/specify-rules.mdc)
            ├── README.md
            ├── commands/
            │   └── speckit.agent-context.update.md  ← описание команды обновления контекста агента
            └── scripts/
                ├── bash/update-agent-context.sh         ← скрипт обновления контекста (Bash)
                └── powershell/update-agent-context.ps1  ← скрипт обновления контекста (PowerShell)
```

---

## Назначение папок и файлов

### `ods-help/` — ваши материалы

| Файл | Назначение |
|------|------------|
| `text.md` | Видение ODS: файловый браузер, Roslyn/TS AST, PostgreSQL, ChromaDB, RAG, агенты, AsciiDoc, PDF, этапы 0–N |
| `setup-speckit-translate.md` | Перевод отчёта об инициализации Spec Kit |
| `create-subagent-cursor.md` | Заметки по созданию custom subagent в Cursor |

Эта папка **не генерируется** Spec Kit — это ваш контекст для будущих спецификаций.

### `specs/` — артефакты фич (появится при работе)

Создаётся skill'ом `/speckit-specify` (скрипт `create-new-feature.sh`). Каждая подпапка `NNN-short-name/` содержит `spec.md`, `plan.md`, `tasks.md` и другие файлы по шаблонам. Это **основной рабочий результат** SDD-цикла.

### `.cursor/` — интеграция Cursor

| Путь | Назначение |
|------|------------|
| `rules/specify-rules.mdc` | Правило, всегда подмешиваемое агенту; extension `agent-context` обновляет в нём ссылку на актуальный `plan.md` |
| `skills/speckit-*/SKILL.md` | Инструкции для каждой slash-команды; агент читает skill и выполняет workflow |

**Skills (команды в Cursor):**

| Skill | Команда | Что делает |
|-------|---------|------------|
| `speckit-constitution` | `/speckit-constitution` | Задаёт конституцию проекта в `.specify/memory/constitution.md` |
| `speckit-specify` | `/speckit-specify` | Создаёт/обновляет `specs/.../spec.md` из описания фичи |
| `speckit-clarify` | `/speckit-clarify` | Уточняющие вопросы по `spec.md` (до `plan.md`) |
| `speckit-plan` | `/speckit-plan` | Генерирует `plan.md` и артефакты проектирования |
| `speckit-checklist` | `/speckit-checklist` | Чеклист качества спецификации |
| `speckit-tasks` | `/speckit-tasks` | Генерирует `tasks.md` |
| `speckit-analyze` | `/speckit-analyze` | Проверка согласованности `spec.md` / `plan.md` / `tasks.md` |
| `speckit-implement` | `/speckit-implement` | Выполняет задачи из `tasks.md` |
| `speckit-converge` | `/speckit-converge` | Добавляет в `tasks.md` недостающую работу по сравнению с кодом |
| `speckit-taskstoissues` | `/speckit-taskstoissues` | Конвертирует задачи из `tasks.md` в GitHub Issues |
| `speckit-agent-context-update` | `/speckit-agent-context-update` | Вручную обновляет блок SPECKIT в context-файле |

### `.specify/` — инфраструктура Spec Kit

| Путь | Назначение |
|------|------------|
| `integration.json` | Состояние интеграций: `cursor-agent`, тип скриптов `sh` |
| `init-options.json` | Параметры инициализации: sequential numbering, версия speckit |
| `extensions.yml` | Hooks: после `/speckit-specify` и `/speckit-plan` предлагать обновить контекст агента |
| `integrations/*.manifest.json` | Контрольные суммы установленных файлов (для обновлений CLI) |
| `memory/constitution.md` | Конституция проекта — принципы и ограничения разработки |
| `templates/*.md` | Заготовки для спецификации, плана, задач, конституции, чеклиста |
| `scripts/bash/*.sh` | Создание фич, проверка предварительных условий, подготовка `plan.md` / `tasks.md` |
| `workflows/speckit/workflow.yml` | Полный SDD-цикл с контрольными точками approve/reject |
| `extensions/agent-context/` | Управление секцией `<!-- SPECKIT START -->` в `.cursor/rules/specify-rules.mdc` |

---

## Рекомендуемый порядок работы

```
/speckit-constitution     → конституция (`constitution.md`)
/speckit-specify          → спецификация (`spec.md`; из `ods-help/text.md` или нового описания)
/speckit-clarify          → (опционально) уточнения по `spec.md`
/speckit-plan             → план (`plan.md`)
/speckit-checklist        → (опционально) чеклист качества спецификации
/speckit-tasks            → задачи (`tasks.md`)
/speckit-analyze          → (опционально) согласованность `spec.md` / `plan.md` / `tasks.md`
/speckit-implement        → реализация по `tasks.md`
/speckit-converge         → добор задач в `tasks.md`
```

Или bundled workflow **Full SDD Cycle** через CLI `specify workflow run speckit`.

---

## Язык документации

### Писать на русском (ваши артефакты)

| Где | Что |
|-----|-----|
| `.specify/memory/` | Только **`constitution.md`** — других файлов в этой папке Spec Kit не создаёт |
| `specs/<фича>/` | Всё, что генерируют skills: `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/**`, `checklists/**` |
| `ods-help/**` | Ваши заметки, видение, инструкции |
| `README.md` | Документация репозитория |
| Будущий код и AsciiDoc | Комментарии, ТЗ, документация приложения — по вашему правилу из видения |

В `.specify/memory/` **только** `constitution.md`. Это единственный «живой» документ уровня проекта вне `specs/`.

### Не переводить (инфраструктура Spec Kit)

| Где | Почему |
|-----|--------|
| `.specify/templates/`, `.specify/scripts/`, `.specify/workflows/`, `.specify/extensions/` | Upstream; `specify update` перезапишет |
| `.specify/*.json`, `extensions.yml`, `integrations/*.manifest.json` | Конфигурация и манифесты |
| `.cursor/skills/**` | Инструкции для slash-команд |
| `.cursor/rules/specify-rules.mdc` | Короткий автоблок `<!-- SPECKIT START -->` (путь к `plan.md`); трогать не обязательно |

### Как получить русский контент

Не переводите шаблоны — при вызове skills указывайте в промпте:

*«Конституция, спецификация, план, задачи, чеклисты и все артефакты в `specs/` — на русском.»*

Агент заполнит английские шаблоны русским текстом. Имена файлов (`spec.md`, `plan.md` и т.д.) остаются как в Spec Kit.


## Безопасность

Папка `.cursor/` может содержать чувствительные данные агентов. При необходимости добавьте части `.cursor/` в `.gitignore`, чтобы не закоммитить credentials.

---

## Ссылки

- [GitHub Spec Kit](https://github.com/github/spec-kit)
- **Запуск MVP в Docker:** [`ods-help/user-guide/commands-run-project.md`](ods-help/user-guide/commands-run-project.md)
- **Архитектура MVP (TypeScript, без .NET):** [`ods-help/user-guide/architecture.md`](ods-help/user-guide/architecture.md)
- Видение ODS: [`ods-help/text.md`](ods-help/text.md)
- Лог установки: [`ods-help/setup-speckit-translate.md`](ods-help/setup-speckit-translate.md)
