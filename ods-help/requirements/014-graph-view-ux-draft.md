# Черновик: `014-graph-view-ux` (+ client HTTP)

**Статус:** черновик до `/speckit-specify` (не канон).  
**Дата:** 2026-07-18  
**После:** close `013` (CP1 API из кода ✅).

**Спеку `013` не расширяем** — клиентские вызовы и UX вынесены сюда.

## Фокус CP2

| # | Тема | Заметка |
|---|------|---------|
| 1 | Кнопки **Код** / **Система** (вместо «В код» / «Войти») | UX |
| 2 | Крошки + срез анализа как в просмотре | UX |
| 3 | Единый sync/analysis overlay на «Граф просмотр» | UX |
| 4 | **`http_calls`**: frontend (и др. клиенты) → `http_endpoint` backend | данные system; edge уже в `009` |

Пункт 4: извлекать `fetch` / клиентский API-helper из TS/React (эталон ods-arch),
связывать с уже существующими `http_endpoint` из `013` (`exposes` не трогать).
Не merge с OpenAPI.

## Вне scope 014

- Менять FR/DoD `013`
- Python / Express / Nest API extract
- docs / RAG / auth (`015`–`017`)

## Связь

- Канон edge: `specs/009-system-landscape/contracts/canonical-edge-types-system.md` (`http_calls`)
- **Семантика связей / виды API (OpenAPI, async, gRPC…):**  
  `system-api-links-semantics-draft.md` — прочитать перед specify `014`
- Предыдущий черновик CP1/CP2: `013-api-routes-from-code-draft.md`
