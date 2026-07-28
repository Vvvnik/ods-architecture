# python-grpc-calls

Extracts statically resolvable grpcio unary calls from `.py` and `.pyw`
files. The native model is the shared `calls[]` contract used by gRPC call
parsers: target service, target method, source path, and optional hints.

Service names are inferred from generated stub imports, constructors, or type
annotations. Calls without an identifiable service are skipped without
failing the run.

Run tests from the repository root:

```bash
pytest parsers/python-grpc-calls/tests
```
