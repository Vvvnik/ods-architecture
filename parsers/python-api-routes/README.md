# python-api-routes

Extracts statically declared FastAPI, Flask, and Django routes from `.py` and
`.pyw` files. The native model is `routes[]`.

FastAPI and Flask decorators require static paths. Django `path()` and
`re_path()` entries are extracted from `urlpatterns`; simple
`include("module.urls")` chains are resolved from the working-copy root.
Dynamic paths and unresolved includes are skipped without failing the run.

Run tests from the repository root:

```bash
pytest parsers/python-api-routes/tests
```
