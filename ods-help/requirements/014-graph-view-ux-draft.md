# Черновик: `014-graph-view-ux`

**Статус:** канон-черновик закрыт → `specs/014-graph-view-ux/spec.md` (2026-07-18).  
**Дата**: 2026-07-18  
**Вход:** close `013` ✅; семантика рёбер — `system-api-links-semantics-draft.md`  
**(не дублировать здесь).**

Имя папки-кандидата: `014-graph-view-ux`. В одной спеке — **два блока**:
UI graph-view и **первый** consumer-link `http_calls`. Спеку `013` не меняем.

---

## A. UX graph-view (бывший CP2 UI)

| # | Что | Точный смысл |
|---|-----|----------------|
| A1 | Подписи действий | **«Код»** / **«Система»** вместо «В код» / «Войти»; плюс **«Посмотреть в анализе»** (срез → GraphPage) |
| A2 | Крошки + срез анализа | Анализ открывается **только на срезе** текущего фокуса схемы; крошки как в просмотре (`Система › …`), **Наверх** / **К системе** — общий UI-компонент |
| A3 | Sync / analysis overlay | Один layout-оверлей на портале **включая** «Граф просмотр»: sync → confirm → прогресс анализа; без отдельных «особых» диалогов только для списка |

Приёмка (ориентир): подписи понятны; из dig-in backend анализ = срез + крошки; sync с canvas не теряет прогресс.

---

## B. Данные: `http_calls` (consumer)

| | |
|--|--|
| **Ребро** | Канон `009`: `http_calls` — **кто вызывает** → `http_endpoint` (не `exposes`, не `documents`, не `depends_on`) |
| **Цель блока** | Эталон ods-arch: **frontend** (и при однозначности другие клиенты) → уже известные HTTP-эндпоинты **backend** |
| **Extract** | Клиентский код TS/React (`fetch` / общий API-helper), **не** регистрация роутов сервера |
| **Стыковка** | Только к **существующим** `http_endpoint` (из `013` и/или OpenAPI `009`) по method+path (+ service). **Новые** endpoint-узлы из URL клиента не плодить. При двух узлах на один path (code + yaml, без merge) — правило выбора в clarify |
| **UI** | Inspector: секция **«Вызывает»** (`http_calls`); не показывать frontend как «публикует API», если есть только исходящие вызовы. Бейджи source / виды API — по `system-api-links-semantics-draft.md` |

---

## Вне scope `014`

- Любые правки FR/DoD **`013`**
- Новые **provider**-парсеры роутов (Express/Nest/Python/gRPC/GraphQL…)
- Merge/дедуп OpenAPI ↔ code endpoints (позже, см. semantics / docs)
- AsyncAPI yaml, усиление bus сверх уже сделанного в `009`
- docs / RAG / auth (`015`–`017`)

---

## Specify: порядок и границы

1. Прочитать `system-api-links-semantics-draft.md` (роли рёбер и виды API).  
2. `/speckit-specify` на этот файл: блоки **A** и **B** явными FR; B MAY урезать до «только frontend→backend», если объём UX велик.  
3. Не тащить в `014` таблицу всех протоколов — она в semantics-черновике.

## Follow-up (не DoD `014`): «В коде» / файлы из graph-view

**Зачем:** у эндпоинта на схеме есть **Система** / **Посмотреть в анализе**;
нужна ещё кнопка в **рабочую копию** (Файловая структура) с фокусом на файл
источника.

**Оценка:**

| Уровень | Сложность | Как |
|---------|-----------|-----|
| **MVP** | **просто** | У `http_endpoint` уже есть `path` = `source_path`. Workspace уже умеет `?highlightPath=` → `resolveElementByPath` → выбор в FileTree. Кнопка = `Link` на `/projects/:id?highlightPath=…` при непустом `node.path`. |
| Точная строка / символ handler | **сложнее** | Нужны line/symbol в metadata + scroll в FileViewer — отдельная спека навигации graph↔workspace. |

**Не путать** с dig-in **«Код»** (слой code на graph-view) — подпись MVP лучше
**«В файлах»** / **«Открыть файл»**.

**Статус:** ⏳ не в scope закрытия `014`; либо мелкий polish после dogfood, либо
FR в следующей спеке «переходы graph ↔ workspace».

## Ссылки

- `system-api-links-semantics-draft.md` — provider/consumer, OpenAPI/async/gRPC  
- `013-api-routes-from-code-draft.md` — история CP1/CP2  
- `specs/009-…/canonical-edge-types-system.md` — канон `EdgeType`  
- `specs/001-ods-vision/spec.md` — дорожная карта  
- Workspace deep-link: `WorkspacePage` + `highlightPath` / `resolveElementByPath`
