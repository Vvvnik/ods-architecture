# java-grpc-calls

Extracts static Java gRPC client call-sites into native `calls[]`.

Input: `.java` files. Output: envelope JSON (`parser_id=java-grpc-calls`).

Skip behavior: test files and unresolved call-shapes are ignored.
