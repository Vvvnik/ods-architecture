# dotnet-http-calls

Extracts static .NET HTTP client call-sites into native `calls[]`.

Input: `.cs` files. Output: envelope JSON (`parser_id=dotnet-http-calls`).

Skip behavior: unresolved URL/path expressions are ignored.
