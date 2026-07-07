# Архитектура MVP (текущая реализация)

Реализованный MVP — **целиком на TypeScript**, без .NET в коде репозитория.

## Стек

| Часть | Каталог | Технологии |
|-------|---------|------------|
| Backend | `backend/` | TypeScript, Node.js 20, Fastify, клиент Elasticsearch |
| Frontend | `frontend/` | TypeScript, React 18, Vite, TanStack Query |
| Тесты | `backend/tests/` | Vitest |
| Docker | `docker/` | Backend: Node alpine; frontend: nginx + статика Vite |
| Метаданные | Elasticsearch 8.11 | проекты, дерево файлов, sync |

Портал: **http://localhost:8080** (nginx проксирует `/api` → backend).

## Чего нет в репозитории

- Нет `.cs`, `.csproj`, `.sln` — только TypeScript/JavaScript и конфиги.
- Нет PostgreSQL, ChromaDB, Roslyn, RAG — это не входит в MVP `002`/`003`.

## Связь со спеками

| Спека | Роль |
|-------|------|
| `001-ods-vision` | Дорожная карта платформы (в т.ч. .NET/Roslyn — **будущие этапы**) |
| `002-domain-model` | Backend API, ES, sync, read-only content |
| `003-portal-mvp` | SPA: импорт, проекты, дерево, просмотр файлов, статусы |

Спеки **002** и **003** зафиксировали:

- **002** — backend на TypeScript (Node + Fastify)
- **003** — портал на React + TypeScript

## Видение vs MVP

В [`ods-help/text.md`](../text.md) и [`specs/001-ods-vision`](../../specs/001-ods-vision/spec.md) описана полная платформа: Roslyn, анализ C#, PostgreSQL, ChromaDB, RAG, графы и т.д.

**Сейчас в git** — только пилотный слой:

```text
Browser (:8080) → nginx → Fastify API → Elasticsearch
                      ↘ mount /repos (git-фикстуры)
```

**.NET и остальное** — в планах платформы, не в текущей реализации.

## Ссылки

- [commands-run-project.md](./commands-run-project.md) — запуск Docker
- [later.md](./later.md) — backlog после MVP
- [specs/002-domain-model/plan.md](../../specs/002-domain-model/plan.md)
- [specs/003-portal-mvp/plan.md](../../specs/003-portal-mvp/plan.md)
