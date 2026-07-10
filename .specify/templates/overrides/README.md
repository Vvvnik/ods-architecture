# ODS overrides шаблонов Spec Kit

Минимальные подмены core-шаблонов (приоритет выше `.specify/templates/*.md`).

| Файл | Зачем |
|------|--------|
| `plan-template.md` | Структура репо ODS по умолчанию (`backend/`, `frontend/`, …) |
| `tasks-template.md` | Пути в задачах — не `src/` в корне |

Конституция — `.specify/memory/constitution.md` (не override).  
`my-constit-ru.md` в `templates/` — черновик, не используется при generate.
