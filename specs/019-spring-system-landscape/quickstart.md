# Quickstart: проверка 019-spring-system-landscape

**Цель:** на petclinic после анализа виден полный Spring system-ландшафт
(A+B+C+D). Контракты — [contracts/](./contracts/).

**Эталон:** project
`c736c364-96b1-442b-8bd4-3a8c2ea05d2d` (spring-petclinic-microservices).

## Предусловия

1. Стек: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
2. Petclinic импортирован, sync + analysis; `java` symbols `available` (`018`).
3. Модули `maven-project`, `spring-config`, `java-api-routes`,
   `java-http-calls` в registry (`available`).
4. При отсутствии WebClient на petclinic — fixture
   `java-http-webclient-demo` (создаётся в implement).

## 1. CP-A — сервисы из Maven (SC-001)

1. Re-analysis petclinic → «Граф просмотр» → фильтр/срез **Система**.
2. **Ожидание:** ≥5 узлов `service` из Boot-модулей; **обязательный минимум
   имён** (после merge — как в compose, если match):
   - `customers-service` (или compose-эквивалент)
   - `vets-service`
   - `visits-service`
   - `api-gateway`
   - плюс ≥1 ещё Boot-сервис эталона (config-server / discovery-server /
     admin / genai — что есть в WC)
3. Parent / library-модули **не** представлены как `service`.
4. Language report: artifact `maven-project` с `parser_status=available`.

## 2. CP-B — config (SC-006)

1. Dig-in / inspector сервиса с локальным `application*.yml`.
2. **Ожидание:** порт и/или `connects_to` к БД при разрешимом datasource;
   без ложных рёбер на placeholder.

## 3. CP-C — API из контроллеров (SC-002)

1. Система → сервис с `@RestController` / `@GetMapping` (MVC — DoD).
2. **Ожидание:** ≥1 HTTP-эндпоинт method+path; сервис **публикует** (`exposes`).
3. WebFlux / Gateway routes — желательны при наличии; **не** блокеры SC-002.
4. «Код» → Java symbols без регресса (`018`, SC-003).

## 4. CP-D — Feign / WebClient (SC-007) и RestClient (SC-008)

1. Карточка сервиса-клиента с Feign → секция **«Вызывает»** ≥1 к существующему
   эндпоинту.
2. То же для WebClient (petclinic или fixture).
3. Petclinic: dig-in `genai-service` → ≥3 `http_calls` **RestClient** к
   `customers-service` (`/owners`, `/owners/{ownerId}/pets`).
4. Негатив: неизвестный path → нет нового эндпоинта только из клиента.

## 5. Отключение модуля (SC-004)

1. Убрать/сломать registry entry любого модуля `019`.
2. **Ожидание:** compose + `java` symbols доступны; `parser_status=missing`
   или нет артефакта.

## 6. Audit (SC-005)

1. Нет второго оркестратора; spawn через `artifacts[]`.
2. Пройден применимый чеклист
   `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
   для каждого нового `parser_id`.

## API (опционально)

```text
GET /api/v1/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/analysis/language-report/latest
GET /api/v1/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph/view
```

Live UI:
`http://localhost:8080/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph-view`
