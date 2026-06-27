# Чеклист: качество API- и data-требований MVP

**Назначение**: Unit-тесты для формулировок API, контрактов и модели данных  
**Создано**: 2026-06-27  
**Фича**: [contracts/openapi.yaml](../contracts/openapi.yaml) | [data-model.md](../data-model.md)

## REST API и контракты

- [ ] CHK001 Описаны ли в OpenAPI все операции MVP, соответствующие FR-001–011? [Completeness, openapi.yaml]
- [ ] CHK002 Согласован ли POST создания файла (FR-003) с tasks T056 и quickstart сценарием 3? [Consistency, openapi.yaml]
- [ ] CHK003 Заданы ли форматы ошибок (409 конфликт, 409 дубликат файла) в контракте? [Completeness, openapi.yaml]
- [ ] CHK004 Описано ли отсутствие аутентификации для всех MVP-операций в контракте API? [Clarity, openapi.yaml, Spec §FR-006]
- [ ] CHK005 Согласован ли параметр фильтра `status` в `/tree` с требованиями US-3? [Consistency, openapi.yaml, tasks T060]

## Модель данных Elasticsearch

- [ ] CHK006 Задокументированы ли все MVP-индексы (`portal-projects`, `portal-elements`, `portal-sync-jobs`, `portal-document-links`)? [Completeness, data-model.md]
- [ ] CHK007 Определены ли правила статусов элементов и значение `auto_discovered` при sync? [Clarity, data-model.md, Spec §FR-005]
- [ ] CHK008 Описано ли разделение: content_hash в ES, содержимое на диске? [Consistency, data-model.md, Spec §FR-007]
- [ ] CHK009 Заданы ли поля sync job для диагностики сбоев (`error_message`, `last_sync_status`)? [Edge Case, data-model.md]

## Sync и файловая система

- [ ] CHK010 Определены ли требования к sync (clone/fetch, scan) без Git push/merge в MVP? [Completeness, Spec §Assumptions, plan.md]
- [ ] CHK011 Описано ли поведение для путей, удалённых на диске (`disk_present: false`)? [Edge Case, data-model.md]
- [ ] CHK012 Согласованы ли пути рабочей копии `/workspace/repos/{project_id}` между plan и data-model? [Consistency]

## Post-MVP data (не смешивать с MVP)

- [ ] CHK013 Явно ли отделены post-MVP индексы `nodes/edges/files` от MVP `portal-*` в data-model? [Consistency, data-model.md]
- [ ] CHK014 Задокументировано ли, что post-MVP Graphify не пишет напрямую в ES в обход адаптера? [Assumption, ods-help/requirements]

## Notes

- Пункты не проверяют работу API — только полноту и ясность требований в документах
