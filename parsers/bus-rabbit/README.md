# bus-rabbit parser

Parses RabbitMQ listeners and message handlers from `.cs` files into native bus-rabbit model (`schema_version: 1`).

CLI: `run.sh` → `run.mjs` (heuristics: `IConsumer<T>`, handler methods, `[RabbitListener]`).

Contract: `specs/009-system-landscape/contracts/native-bus-rabbit.schema.json`.
