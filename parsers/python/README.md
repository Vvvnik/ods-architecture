# Python parser (`parser_id=python`)

Extracts symbols from `.py` files using the **stdlib `ast` module** (no third-party deps).

## Local run

```bash
chmod +x run.sh
./run.sh \
  --project-id 00000000-0000-4000-8000-000000000001 \
  --working-copy-root /path/to/repo \
  --analysis-run-id 00000000-0000-4000-8000-000000000002 \
  --files '["app.py"]' \
  --output /tmp/envelope.json
```

## Native model v1

```json
{
  "symbols": [
    {
      "name": "main",
      "kind": "function",
      "path": "app.py",
      "qualified_name": "app.main",
      "parent_qualified_name": "app",
      "signature": "()",
      "location": { "start_line": 1, "start_col": 0, "end_line": 3, "end_col": 0 },
      "refs": [{ "type": "imports", "name": "os", "kind": "module", "qualified_name": "os" }]
    }
  ]
}
```

Requires `python3` on PATH (installed in backend Docker image).
