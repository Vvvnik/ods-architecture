# Инициализация проекта Specify

## Параметры установки

| Параметр | Значение |
|----------|----------|
| Интеграция coding agent | `cursor-agent` |
| Тип скриптов | `sh` |

> **Deprecation:** встроенное обновление agent-context во время setup интеграции будет отключено в v0.12.0. Управление context file перенесено в bundled extension `agent-context`. Чтобы отказаться заранее, выполните: `specify extension disable agent-context`.

## Ход установки

```
Initialize Specify Project
├── ● Проверка необходимых инструментов (ok)
├── ● Выбор интеграции coding agent (cursor-agent)
├── ● Выбор типа скриптов (sh)
├── ● Установка интеграции (Cursor)
├── ● Установка shared infrastructure (scripts (sh) + templates)
├── ● Права на выполнение скриптов (обновлено: 5)
├── ● Настройка constitution (скопировано из template)
├── ● Установка bundled workflow (speckit installed)
├── ● Установка extension agent-context (extension installed)
└── ● Завершение (project ready)
```

**Проект готов.**

---

## Безопасность папки agent

Некоторые agents могут хранить credentials, auth tokens и другие идентифицирующие или приватные артефакты в папке agent внутри проекта.

Рекомендуется добавить `.cursor/` (или её части) в `.gitignore`, чтобы исключить случайную утечку credentials.

---

## Следующие шаги

1. Вы уже находитесь в директории проекта.
2. Запустите Cursor Agent в этой директории; skills spec-kit установлены в `.cursor/skills`.
3. Начните использовать skills с coding agent:
   - `/speckit-constitution` — задать принципы проекта
   - `/speckit-specify` — создать базовую specification
   - `/speckit-plan` — составить implementation plan 
   - `/speckit-tasks` — сгенерировать actionable tasks
   - `/speckit-implement` — выполнить implementation
   - `/speckit-converge` — оценить codebase и добавить оставшуюся работу в tasks

---

## Дополнительные skills

Опциональные skills для улучшения качества и уверенности в specs:

| Skill | Описание |
|-------|----------|
| `/speckit-clarify` *(optional)* | Структурированные вопросы для снижения рисков в неоднозначных местах перед planning (запускать до `/speckit-plan`, если используется) |
| `/speckit-analyze` *(optional)* | Отчёт о cross-artifact consistency и alignment (после `/speckit-tasks`, до `/speckit-implement`) |
| `/speckit-checklist` *(optional)* | Генерация quality checklists для проверки полноты, ясности и согласованности requirements (после `/speckit-plan`) |
