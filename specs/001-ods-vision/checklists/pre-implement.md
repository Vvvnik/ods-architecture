# Чеклист: готовность к реализации MVP (001-ods-vision)

**Назначение**: Проверка качества и согласованности требований перед `/speckit-implement`  
**Создано**: 2026-06-27  
**Фича**: [spec.md](../spec.md) v1.5.0 | [plan.md](../plan.md) | [tasks.md](../tasks.md)

**Примечание**: Пункты проверяют **формулировки требований**, а не работу кода.

## Согласованность артефактов

- [ ] CHK001 Зафиксирован ли явный scope MVP (FR-001–FR-011) и отделение post-MVP во всех трёх артефактах? [Consistency, Spec §Границы MVP]
- [ ] CHK002 Согласовано ли решение «только Elasticsearch» между spec Assumptions, plan и research без упоминания PostgreSQL/ChromaDB как активных вариантов? [Consistency, Spec §Assumptions]
- [ ] CHK003 Явно ли задокументировано отсутствие RAG, эмбеддингов и этапа `008-rag` в spec и plan? [Consistency, Spec §Clarifications v1.5.0]
- [ ] CHK004 Согласована ли модель «метаданные в ES / содержимое файлов на диске» между spec FR-007, data-model и plan? [Consistency, Spec §FR-007]
- [ ] CHK005 Есть ли явная связь tasks.md → plan.md → contracts (OpenAPI, ui-routes) для каждой user story MVP? [Traceability, Gap]
- [ ] CHK006 Задокументировано ли, что TypeScript-портал — MVP, а .NET/Roslyn — post-MVP, без противоречия с ods-help/requirements? [Consistency, Assumption]

## Полнота требований MVP

- [ ] CHK007 Описаны ли требования регистрации проекта без входа и без роли «администратор» однозначно? [Clarity, Spec §FR-001, FR-006]
- [ ] CHK008 Определены ли требования к созданию, чтению и сохранению текстовых файлов (FR-002, FR-003) с критериями приёмки? [Completeness, Spec §FR-002–003]
- [ ] CHK009 Заданы ли измеримые требования к навигации и оглавлению (FR-004) или только общая формулировка? [Clarity, Spec §FR-004]
- [ ] CHK010 Зафиксирован ли полный набор статусов элементов и значение по умолчанию при sync? [Completeness, Spec §FR-005]
- [ ] CHK011 Описаны ли требования к разделу «Документация» и ручным связям документ ↔ код? [Completeness, Spec §FR-009–010]
- [ ] CHK012 Определено ли поведение при конфликте сохранения (FR-011) без автоматического merge? [Clarity, Spec §FR-011]

## Критерии успеха и приёмка

- [ ] CHK013 Измеримы ли SC-001 и SC-004 числовыми порогами, пригодными для проверки без знания реализации? [Measurability, Spec §SC-001, SC-004]
- [ ] CHK014 Описано ли, как проверяются SC-002 и SC-003 (опрос пилота) в quickstart или spec? [Coverage, Spec §SC-002–003]
- [ ] CHK015 Покрывает ли quickstart.md все MVP user stories (US-1–3) и ключевые FR? [Coverage, quickstart.md]
- [ ] CHK016 Есть ли в quickstart сценарий создания нового файла, согласованный с контрактом POST /files? [Consistency, contracts/openapi.yaml]

## Граничные случаи и ошибки

- [ ] CHK017 Заданы ли требования к сообщениям при ошибках доступа, импорта и сохранения (FR-008)? [Completeness, Spec §FR-008]
- [ ] CHK018 Описано ли поведение при неподдерживаемой кодировке файла? [Edge Case, Spec §Edge Cases]
- [ ] CHK019 Описано ли поведение при сбое sync и отображении статуса операции? [Edge Case, Spec §Edge Cases, ui-routes.md]
- [ ] CHK020 Заданы ли требования к большому дереву (десятки тысяч узлов) с измеримым откликом? [Non-Functional, Spec §SC-001, SC-004]

## Post-MVP и дорожная карта

- [ ] CHK021 Явно ли исключены из MVP Graphify, граф, вход, Git push/merge, PDF, RAG? [Completeness, Spec §Не входит в MVP]
- [ ] CHK022 Согласована ли дорожная карта этапов 1–8 с отсутствием этапа RAG в spec v1.5.0? [Consistency, Spec §Дорожная карта]
- [ ] CHK023 Задокументированы ли post-MVP FR (012, 013, 015, 017, 018) без пробелов нумерации, с пояснением снятых FR-014/016? [Traceability, Spec §Requirements]

## Конституция и процесс SDD

- [ ] CHK024 Статус spec «Согласовано» и наличие plan + tasks соответствуют принципу «код после документации»? [Constitution §V]
- [ ] CHK025 Понятно ли из артефактов, что правки scope (например, возврат .NET в MVP) требуют новой версии spec, а не только tasks? [Constitution §II–III]

## Notes

- Отмечайте выполненные пункты: `[x]`
- Несогласованности фиксируйте ссылкой на файл и раздел
- После прохождения — `/speckit-implement`
