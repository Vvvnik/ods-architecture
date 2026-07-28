# ts-grpc-calls

Extracts static TypeScript gRPC client call-sites into native `calls[]`.

Input: TS/JS source files. Output: envelope JSON (`parser_id=ts-grpc-calls`).

Skip behavior: test/spec files and unresolved call-shapes are ignored.
