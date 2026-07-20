# system-landscape-demo

Mini-monorepo для SC-001 / quickstart `009-system-landscape`.

Содержит:

- `docker-compose.yml` — compose topology
- `src/Api/appsettings.json` — connection strings + RabbitMQ
- `contracts/openapi.yaml` — HTTP endpoints
- `system-landscape.sln` + `src/*/*.csproj` — project references
- `src/Worker/OrderCreatedListener.cs` — Rabbit consumer (bus-rabbit)

Подключение: `docker/fixtures/repos/setup-fixtures.sh`.

Импорт в Docker: `/repos/system-landscape-demo`.
