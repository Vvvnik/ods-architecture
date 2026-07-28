# dotnet-grpc-calls

Extracts static .NET gRPC client call-sites into native `calls[]`.

Input: `.cs` files. Output: envelope JSON (`parser_id=dotnet-grpc-calls`).

Skip behavior: non-C# files and unresolved call-shapes are ignored.
