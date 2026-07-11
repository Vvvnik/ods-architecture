    nodes.json — все сущности.

Repository
Project
File
Namespace
Class
Interface
Method
Property
Field
Parameter
Function
Variable
...

    edges.json — все связи.
Contains
Calls
Inherits
Implements
UsesType
References
Reads
Writes
Creates
DependsOn
...

    metadata.json — информация о репозитории и результате парсинга.

Repository
Commit
Branch
ParserVersion
ParseTime
Statistics
Diagnostics
...

Это не AST, а уже семантический слой извлечения.
C# (Roslyn input → CSharp Extract Model)
{
  "language": "csharp",
  "file": {
    "path": "Services/UserService.cs",
    "hash": "..."
  },
  "symbols": [
    {
      "id": "class:UserService",
      "kind": "class",
      "name": "UserService",
      "namespace": "App.Services",
      "modifiers": ["public", "sealed"],
      "baseTypes": ["BaseService"],
      "interfaces": ["IUserService"],
      "location": {
        "startLine": 12,
        "endLine": 180
      }
    }
  ],
  "members": [
    {
      "id": "method:UserService.Create",
      "kind": "method",
      "parentId": "class:UserService",
      "name": "Create",
      "returnType": "Task<User>",
      "parameters": [
        { "name": "dto", "type": "CreateUserDto" }
      ],
      "modifiers": ["public", "async"],
      "location": {
        "startLine": 40,
        "endLine": 78
      }
    }
  ],
  "usages": [
    {
      "from": "method:UserService.Create",
      "to": "class:UserRepository",
      "type": "create|call|reference|inject"
    }
  ]
}

TypeScript (TS Compiler → TS Extract Model)

{
  "language": "typescript",
  "file": {
    "path": "services/userService.ts",
    "hash": "..."
  },
  "symbols": [
    {
      "id": "class:UserService",
      "kind": "class",
      "name": "UserService",
      "exported": true,
      "location": {
        "startLine": 1,
        "endLine": 120
      }
    }
  ],
  "members": [
    {
      "id": "method:UserService.create",
      "kind": "method",
      "parentId": "class:UserService",
      "name": "create",
      "returnType": "Promise<User>",
      "parameters": [
        { "name": "dto", "type": "CreateUserDto" }
      ],
      "async": true,
      "location": {
        "startLine": 20,
        "endLine": 55
      }
    }
  ],
  "imports": [
    {
      "module": "./repo/userRepo",
      "named": ["UserRepo"]
    }
  ],
  "usages": [
    {
      "from": "method:UserService.create",
      "to": "class:UserRepo",
      "type": "call|new|import"
    }
  ]
}

Ключевая идея архитектуры

Ты не хранишь AST вообще.

Ты строишь:

Language AST
   ↓
Semantic Extractor
   ↓
Unified Extract Model (C# / TS одинаковый формат)
   ↓
Graph Builder
   ↓
Elasticsearch / Graph / LLM

Минимально правильный совет

Если упростить до ядра:

Делай ОДНУ модель:

Node {
  id
  kind
  name
  language
  parentId
  signature
  location
  metadata
}

Edge {
  from
  to
  type
}

Индекс ods-nodes
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "kind": { "type": "keyword" },
      "name": { "type": "text", "fields": { "raw": { "type": "keyword" } } },
      "language": { "type": "keyword" },

      "file": { "type": "keyword" },
      "parentId": { "type": "keyword" },

      "signature": { "type": "text" },

      "location": {
        "properties": {
          "startLine": { "type": "integer" },
          "endLine": { "type": "integer" }
        }
      },

      "metadata": {
        "type": "object",
        "enabled": true
      }
    }
  }
}

Индекс ods-edges

Назначение

Все связи в коде (граф).

{
  "mappings": {
    "properties": {
      "from": { "type": "keyword" },
      "to": { "type": "keyword" },

      "type": {
        "type": "keyword"
      },

      "language": {
        "type": "keyword"
      },

      "file": {
        "type": "keyword"
      },

      "context": {
        "type": "object",
        "enabled": false
      }
    }
  }
}

Индекс ods-files (опционально, но полезен)

{
  "mappings": {
    "properties": {
      "fileId": { "type": "keyword" },
      "path": { "type": "keyword" },
      "language": { "type": "keyword" },
      "hash": { "type": "keyword" },

      "repo": { "type": "keyword" },

      "stats": {
        "properties": {
          "lines": { "type": "integer" },
          "methods": { "type": "integer" },
          "classes": { "type": "integer" }
        }
      }
    }
  }
}

Как это работает вместе

Запись
C#/TS Parser
   ↓
Extract Model
   ↓
Bulk insert:
   → ods-nodes
   → ods-edges
   → ods-files

Как ты будешь делать запросы

Найти метод

GET ods-nodes/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "kind": "method" } },
        { "match": { "name": "CreateUser" } }
      ]
    }
  }
}

Найти вызовы метода
GET ods-edges/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "type": "calls" } },
        { "term": { "from": "method:UserService.Create" } }
      ]
    }
  }
}
Найти весь контекст класса
GET ods-edges/_search
{
  "query": {
    "bool": {
      "should": [
        { "term": { "from": "class:UserService" } },
        { "term": { "to": "class:UserService" } }
      ]
    }
  }
}

7. Ключевая архитектурная идея

Elasticsearch у тебя НЕ графовая база.

Он у тебя:

	•	быстрый индекс узлов
	•	быстрый индекс связей
	•	быстрый текстовый поиск

А граф строится:

	•	либо на уровне сервиса
	•	либо в памяти (graph builder layer)

⸻

8. Если упростить до сути

У тебя должно быть только 2 сущности:

NODE  (всё что существует)
EDGE  (всё что между ними)



# ODS Architecture — Выводы по моделям парсинга и графа

## 1. Общий принцип системы
Система не хранит AST (Roslyn или TypeScript) как основной формат. AST используется только как промежуточный источник данных.

Основная цель — построение единой графовой модели кода:

- узлы (nodes)
- связи (edges)
- файловый контекст

## 2. Поток обработки данных

Исходный код
→ парсер языка (C# / TypeScript)
→ извлечение семантической модели
→ преобразование в единый граф
→ индексация в Elasticsearch

## 3. Каноническая модель

### Node (сущности)
- class, method, interface, function, field, property
- содержит:
  - id
  - kind
  - name
  - language
  - parentId
  - signature
  - location
  - metadata

### Edge (связи)
- calls
- inherits
- implements
- usesType
- references
- creates
- reads / writes

Содержит:
- from
- to
- type
- language

## 4. Языковые парсеры

### C# (Roslyn)
- используется только для извлечения семантики
- формирует C# extract model
- далее преобразуется в unified graph model

### TypeScript (TS Compiler API)
- аналогично C#
- формирует TS extract model
- далее преобразуется в unified graph model

## 5. Elasticsearch структура

### Индекс nodes
- хранит все сущности кода
- поддерживает текстовый и структурный поиск

### Индекс edges
- хранит все связи между сущностями
- используется для построения графа зависимостей

### Индекс files
- метаданные файлов
- статистика и хэши

## 6. Итоговая архитектура

C# / TypeScript
→ Language Parser
→ Extract Model
→ Unified Graph Model (nodes + edges)
→ Elasticsearch

## 7. Ключевой результат

- единый формат графа для всех языков
- отсутствие зависимости от AST в хранилище
- возможность масштабируемого анализа кода
- поддержка поиска, графового анализа и LLM-интерпретации