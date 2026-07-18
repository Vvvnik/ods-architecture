# Quickstart: проверка 013-api-routes-from-code (CP1)

**Цель:** после анализа на схеме в system-интерьере сервиса видны HTTP
эндпоинты из **кода**. Контракты — [contracts/](./contracts/).

## Предусловия

1. Стек: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
2. Фикстуры: **ods-arch**; **api-routes-csharp-demo** (создаётся в implement)
   импортированы, sync + analysis завершены.
3. Модули `ts-api-routes` и `dotnet-api-routes` в registry (`available`).

## 1. TS / ods-arch (SC-001, SC-003)

1. «Граф просмотр» → Система → **Войти** в `backend` (system).
2. **Ожидание:** ≥1 узел HTTP-эндпоинт с путём в духе `/api/v1/...`
   (например health или graph/view).
3. **В код** на том же сервисе → модули/символы code, без регресса `012`.
4. API (опционально):  
   `GET .../graph/view?focus=<backendServiceId>` — среди nodes есть
   `kind=http_endpoint`, `metadata.source=code` (или parser_id
   `ts-api-routes`).

## 2. C# fixture (SC-002)

1. Проект api-routes-csharp-demo → анализ.
2. System-вход в сервис: виден эндпоинт из **controller** и из **MapGet**
   (один экран или два фокуса — по структуре fixture).
3. Code-слой сервиса — символы на месте.

## 3. Связь exposes (US3)

1. На срезе backend с эндпоинтами — в inspector/связях видно, что сервис
   **публикует API** (`exposes`).
2. Негатив: файл роутов без сопоставимого сервиса → эндпоинт может быть,
   без ложной привязки ко всем сервисам.

## 4. Отключение модуля (SC-004)

1. Убрать/сломать registry entry `ts-api-routes` (или симулировать missing).
2. Анализ ods-arch → compose-сервисы и code-граф живы; статус модуля
   `missing`/`failed` не валит прогон целиком.

## 5. Audit переиспользования (SC-005)

- Нет второго оркестратора; только `parsers/*` + ingest adapters + detector
  artifacts.
- OpenAPI не «починен» merge’ем в этой фиче.

## Не проверяем здесь

- Кнопки «Код»/«Система», срез анализа, sync-оверлей (`014`)
- Python / Express / Nest
- Дедуп с OpenAPI yaml
