import json
import subprocess
import sys
from pathlib import Path


EXTRACT = Path(__file__).parents[1] / "extract.py"


def run_extract(root: Path, files: list[str], use_file_list: bool = False) -> dict:
    output = root / "output.json"
    command = [
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
    ]
    if use_file_list:
        file_list = root / "files.txt"
        file_list.write_text("\n".join(files), encoding="utf-8")
        command.extend(["--file-list", str(file_list)])
    else:
        command.extend(["--files", json.dumps(files)])
    subprocess.run(command, check=True)
    return json.loads(output.read_text(encoding="utf-8"))


def test_extracts_fastapi_flask_and_filters_non_python(tmp_path: Path) -> None:
    (tmp_path / "fastapi_app").mkdir()
    (tmp_path / "fastapi_app/main.py").write_text(
        """
from fastapi import FastAPI, APIRouter
app = FastAPI()
router = APIRouter()

@app.get("/health")
def health(): pass

@router.post("/items/{item_id}")
async def item(item_id): pass
""",
        encoding="utf-8",
    )
    (tmp_path / "flask_app").mkdir()
    (tmp_path / "flask_app/app.py").write_text(
        """
from flask import Flask
app = Flask(__name__)

@app.route("/ping", methods=["GET", "POST"])
def ping(): pass
""",
        encoding="utf-8",
    )
    (tmp_path / "ignored.txt").write_text("@app.get('/wrong')", encoding="utf-8")

    envelope = run_extract(
        tmp_path,
        ["fastapi_app/main.py", "flask_app/app.py", "ignored.txt"],
        use_file_list=True,
    )
    routes = envelope["model"]["routes"]

    assert envelope["parser_id"] == "python-api-routes"
    assert envelope["files_analyzed"] == ["fastapi_app/main.py", "flask_app/app.py"]
    assert any(route["framework"] == "fastapi" and route["path"] == "/items/{item_id}" for route in routes)
    assert {(route["method"], route["path"]) for route in routes if route["framework"] == "flask"} == {
        ("GET", "/ping"),
        ("POST", "/ping"),
    }


def test_flask_method_decorators_use_flask_framework(tmp_path: Path) -> None:
    (tmp_path / "flask_app").mkdir()
    (tmp_path / "flask_app/app.py").write_text(
        """
from flask import Flask
app = Flask(__name__)

@app.get("/ready")
def ready(): pass
""",
        encoding="utf-8",
    )

    routes = run_extract(tmp_path, ["flask_app/app.py"])["model"]["routes"]

    assert routes == [
        {
            "method": "GET",
            "path": "/ready",
            "source_path": "flask_app/app.py",
            "handler_name": "ready",
            "service_hint": "flask_app",
            "path_complete": True,
            "framework": "flask",
        }
    ]


def test_resolves_django_include_and_skips_unresolved_include(tmp_path: Path) -> None:
    package = tmp_path / "django_app"
    package.mkdir()
    (package / "urls.py").write_text(
        """
from django.urls import include, path, re_path
from . import views
urlpatterns = [
    path("health/", views.health),
    re_path(r"^legacy/$", views.health),
    path("api/", include("django_app.api_urls")),
    path("missing/", include("django_app.missing_urls")),
]
""",
        encoding="utf-8",
    )
    (package / "api_urls.py").write_text(
        """
from django.urls import path
from . import views
urlpatterns = [
    path("orders/", views.orders),
    path("orders/<int:pk>/", views.order),
]
""",
        encoding="utf-8",
    )

    routes = run_extract(tmp_path, ["django_app/urls.py", "django_app/api_urls.py"])["model"]["routes"]
    paths = {route["path"] for route in routes}

    assert "/health/" in paths
    assert "/legacy/" in paths
    assert "/api/orders/" in paths
    assert "/api/orders/<int:pk>/" in paths
    assert "/orders/" not in paths
    assert all(not path.startswith("/missing/") for path in paths)
    assert all(route["path_complete"] for route in routes)
