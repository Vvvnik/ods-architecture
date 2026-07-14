# bus-kafka parser

Parses Kafka consumers and MassTransit handlers from `.cs` files into native bus-kafka model (`schema_version: 1`).

CLI: `run.sh` → `run.mjs` (heuristics: `IConsumer<T>`, `Topic("...")`).

Contract: `specs/009-system-landscape/contracts/native-bus-kafka.schema.json`.
