# Demo: code-graph-depth (008)

Минимальный C# + TypeScript проект для проверки спеки
`008-code-graph-depth`: рёбра `calls` и (для C#) `injects` в графе портала.

## Структура

```text
csharp/
  Repo.cs       — метод Save
  Service.cs    — ctor DI (Repo) + Create() вызывает _repo.Save()
typescript/
  save.ts       — export function save()
  create.ts     — create() вызывает save() (cross-file)
```

## Ожидание после анализа (008)

| Язык | Что увидеть на экране «Граф» |
|------|------------------------------|
| C# | `calls`: `Sample.Service.Create` → `Sample.Repo.Save` |
| C# | `injects`: `Sample.Service` → `Sample.Repo` |
| TS | `calls`: `create` → `save` |

## Подготовка git

```bash
./docker/fixtures/repos/setup-fixtures.sh
```

## Импорт

**Docker (`full`):**

```text
source_type: local_path
source_value: /repos/code-graph-depth-demo
```

**Хост:**

```text
source_value: <repo>/docker/fixtures/repos/code-graph-depth-demo
```

После sync → подтвердить языки C# и TypeScript → дождаться анализа → открыть «Граф» / поиск по `Create`, `Save`, `calls`.
