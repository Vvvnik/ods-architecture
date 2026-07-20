# system-landscape-demo

Mini-monorepo for SC-001 / the `009-system-landscape` quickstart.

Contains:

- `docker-compose.yml` — compose topology
- `src/Api/appsettings.json` — connection strings + RabbitMQ
- `contracts/openapi.yaml` — HTTP endpoints
- `system-landscape.sln` + `src/*/*.csproj` — project references
- `src/Worker/OrderCreatedListener.cs` — Rabbit consumer (bus-rabbit)

Setup: `docker/fixtures/repos/setup-fixtures.sh`.

Docker import path: `/repos/system-landscape-demo`.
