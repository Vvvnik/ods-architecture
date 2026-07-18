# Quickstart: проверка 012-code-graph-bottom

**Цель:** с system-карты провалиться в code до листа канона на `ods-arch`,
не сломав system-просмотр. Контракты — [contracts/](./contracts/).

## Предусловия

1. Стек: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
2. Проект **ods-arch** (`/repos/ods-arch`) импортирован, sync + analysis
   завершены; есть compose-сервисы и code-граф.
3. Для регресса system — также `system-landscape-demo` (или system на ods-arch).

## 1. Регресс системы (SC-004)

1. «Граф просмотр» → карта Система (frontend, backend, elasticsearch).
2. Войти в `backend` → system-интерьер (не сразу classes).
3. Наверх / к системе — без ошибок.

## 2. Вход в code (SC-001, FR-013)

1. Фокус `backend` (system) → в inspector **«В код»**.
2. **Ожидание:** `layer=code`; модули/файлы backend (не весь frontend).
3. API: `GET .../graph/view?focus=<backendId>&layer=code` —
   `empty_reason` ≠ `no_related_code` (если анализ богат).

## 3. До дна

1. Войти в модуль → типы; при наличии методов — ещё уровень.
2. Крошки / «Наверх» возвращают предков.
3. Одиночный клик по соседу = inspector; «Войти» меняет фокус (в т.ч. на
   чужой компонент, если сосед снаружи).

## 4. Пустой code (SC-003)

1. «В код» у `elasticsearch` (или сервиса без path-match).
2. **Ожидание:** пустое состояние «связанный код не найден»; возврат к
   системе возможен.

## 5. Два компонента (SC-006)

1. Code-срез `frontend` и `backend` различимы (разные узлы / paths).
2. Не один общий dump всего проекта на обоих входах.

## 6. Из анализа (SC-007)

1. «Граф анализ» → выбрать class/method → «Открыть на схеме».
2. **Ожидание:** фокус на этом code-узле (`resolve_status=exact_code` или
   эквивалент), не только карта системы.
3. «В анализе» обратно — тот же узел.

## 7. Усечение

1. При необходимости `max_nodes=20` на широком code-фокусе → `truncated=true`
   + русский баннер; зум не подгружает остальное.

## Критерии прогона

| SC | Проверка |
|----|----------|
| SC-001 | Система → backend system → В код → лист |
| SC-002 | Нет полного code-графа проекта на срезе |
| SC-003 | elasticsearch / без code — empty |
| SC-004 | system-only сценарий жив |
| SC-005 | нет edit на схеме |
| SC-006 | frontend ≠ backend срезы |
| SC-007 | open-from-analysis → focus на code (`exact_code`) или явный fallback |

## Не проверяем здесь

- Новые парсеры / запись affiliation в ES
- Docs / RAG / auth
- Иерархию БД
