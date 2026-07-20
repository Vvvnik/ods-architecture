# spring-config

Artifact parser for local `application*.yml`, `.yaml`, and `.properties` files.
Returns `server.port` and data sources with a resolvable JDBC engine; placeholders
do not produce data sources. Native model: contract 019 `configs[]`.

Run with `node run.mjs` through the shared 005 CLI contract.
