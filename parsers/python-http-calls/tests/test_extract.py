import json
import subprocess
import sys
from pathlib import Path


EXTRACT = Path(__file__).parents[1] / "extract.py"


def run_extract(root: Path, files: list[str]) -> dict:
    output = root / "output.json"
    subprocess.run(
        [
            sys.executable,
            str(EXTRACT),
            "--project-id",
            "project",
            "--working-copy-root",
            str(root),
            "--analysis-run-id",
            "run",
            "--output",
            str(output),
            "--files",
            json.dumps(files),
        ],
        check=True,
    )
    return json.loads(output.read_text(encoding="utf-8"))


def test_extracts_httpx_requests_and_aiohttp(tmp_path: Path) -> None:
    clients = tmp_path / "http_clients"
    clients.mkdir()
    (clients / "calls.py").write_text(
        """
import httpx
import requests as rq
import aiohttp

httpx.get("/health")
httpx.Client().post("http://fastapi_app:8000/items")
rq.get("http://flask_app:5000/ping")
client = httpx.Client(base_url="http://fastapi_app:8000")
client.put("/items/42")

async def fetch():
    async with aiohttp.ClientSession() as session:
        await session.delete("/api/orders/1/")
""",
        encoding="utf-8",
    )

    calls = run_extract(tmp_path, ["http_clients/calls.py"])["model"]["calls"]

    assert {call["client_kind"] for call in calls} == {"httpx", "requests", "aiohttp"}
    assert any(call.get("path") == "/health" and call["method"] == "GET" for call in calls)
    assert any(call.get("url") == "http://fastapi_app:8000/items" and call["callee_service_hint"] == "fastapi_app" for call in calls)
    assert any(call.get("path") == "/items/42" and call["callee_service_hint"] == "fastapi_app" for call in calls)
    assert any(call.get("path") == "/api/orders/1/" and call["method"] == "DELETE" for call in calls)


def test_skips_dynamic_f_strings_and_unrelated_get_calls(tmp_path: Path) -> None:
    source = tmp_path / "client.py"
    source.write_text(
        """
import httpx
item_id = "42"
httpx.get(f"/items/{item_id}")
client.get("/not-an-http-client")
""",
        encoding="utf-8",
    )

    calls = run_extract(tmp_path, ["client.py", "notes.md"])["model"]["calls"]

    assert calls == []
