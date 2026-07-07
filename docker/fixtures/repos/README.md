# Тестовые git-репозитории для ODS MVP

Каталог монтируется в backend-контейнер как `/repos:ro` (см. `docker/.env.example`).

## `sample-project`

Минимальный репозиторий для quickstart и пилота:

- `README.md` — текстовый файл для просмотра в портале
- `src/hello.ts` — пример исходника

### Использование

**Локальный backend** (`npm run dev`):

```bash
source_type: local_path
source_value: <абсолютный путь>/docker/fixtures/repos/sample-project
```

**Backend в Docker** (профиль `full`):

```bash
source_type: local_path
source_value: /repos/sample-project
```

### Добавить свой репозиторий

1. Склонировать или `git init` новую папку под `docker/fixtures/repos/`.
2. Убедиться, что это git-репозиторий (есть `.git`).
3. Зарегистрировать через API или UI портала.
