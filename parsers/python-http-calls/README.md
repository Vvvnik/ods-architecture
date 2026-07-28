# python-http-calls

Extracts static outgoing HTTP calls made with httpx, requests, and aiohttp
from `.py` and `.pyw` files. The native model is `calls[]`.

Literal absolute URLs are emitted as `url`; literal root-relative values are
emitted as `path`. Dynamic f-strings and other unresolved expressions are
skipped without failing the run.

Run tests from the repository root:

```bash
pytest parsers/python-http-calls/tests
```
