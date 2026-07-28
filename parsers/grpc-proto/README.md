# grpc-proto

Extracts gRPC services/methods from `.proto` files into native `services[]`.

Input: `--working-copy-root`, `--files` (or `--file-list`).
Output: envelope JSON (`parser_id=grpc-proto`, `schema_version=1`).

Skip behavior: non-`.proto` files are ignored.
