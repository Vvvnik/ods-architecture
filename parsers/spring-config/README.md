# spring-config

Artifact-парсер локальных `application*.yml`, `.yaml` и `.properties`.
Возвращает `server.port` и datasource с разрешимым JDBC engine; placeholders
не порождают datasource. Native-модель: `configs[]` контракта 019.

Запуск: `node run.mjs` через общий CLI-контракт 005.
