# Parser fixtures (локальные для тестов)

**Канон исходников демо 008** (`calls`/`injects`):  
`docker/fixtures/repos/code-graph-depth-demo/`  
Интеграционные тесты копируют оттуда (`csharp-parser-calls`, `typescript-parser-calls`).

| Каталог | Назначение |
|---------|------------|
| `csharp-ambiguous/` | Overloads без однозначного `calls` (сценарий «нет ребра») |

Не дублируйте сюда копии `code-graph-depth-demo` — один источник правды в `docker/fixtures/repos/`.
