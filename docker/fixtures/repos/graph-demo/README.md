# graph-demo

Небольшой TypeScript-проект для проверки графа ODS: модули + рёбра `imports` (from → to).

После sync и анализа на экране «Граф» должны появиться узлы модулей/функций и связи между файлами.

## Файлы

| Файл | Импортирует |
|------|-------------|
| `src/app.ts` | `logger`, `services/user`, `utils/math` |
| `src/services/user.ts` | `logger`, `utils/math` |
| `src/logger.ts` | — |
| `src/utils/math.ts` | — |

## Импорт в Docker

```text
source_type: local_path
source_value: /repos/graph-demo
```

Локально: абсолютный путь к `docker/fixtures/repos/graph-demo`.

Перед первым импортом нужен git в каталоге (если ещё нет `.git`):

```bash
cd docker/fixtures/repos/graph-demo && git init && git add . && git commit -m 'graph demo'
```
