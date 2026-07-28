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


def test_extracts_generated_stub_call_with_package(tmp_path: Path) -> None:
    client_dir = tmp_path / "grpc_client"
    client_dir.mkdir()
    (client_dir / "client.py").write_text(
        """
from demo.v1.orders_pb2_grpc import OrdersServiceStub

stub = OrdersServiceStub(channel)
response = stub.GetOrder(request)
""",
        encoding="utf-8",
    )

    calls = run_extract(tmp_path, ["grpc_client/client.py"])["model"]["calls"]

    assert calls == [
        {
            "target_service": "demo.v1.OrdersService",
            "target_method": "GetOrder",
            "source_path": "grpc_client/client.py",
            "service_hint": "grpc_client",
            "location": {
                "start_line": 5,
                "start_col": 11,
                "end_line": 5,
                "end_col": 33,
            },
        }
    ]


def test_strips_any_pb2_grpc_module_not_only_orders(tmp_path: Path) -> None:
    client = tmp_path / "client.py"
    client.write_text(
        """
from demo.v1.users_pb2_grpc import UsersServiceStub

stub = UsersServiceStub(channel)
stub.GetUser(request)
""",
        encoding="utf-8",
    )

    calls = run_extract(tmp_path, ["client.py"])["model"]["calls"]

    assert [(call["target_service"], call["target_method"]) for call in calls] == [
        ("demo.v1.UsersService", "GetUser")
    ]


def test_uses_type_hint_and_skips_unresolved_stub(tmp_path: Path) -> None:
    source = tmp_path / "client.py"
    source.write_text(
        """
from demo.v1.orders_pb2_grpc import OrdersServiceStub

client: OrdersServiceStub
client.GetOrder(request)
stub.GetOrder(request)
stub.lowercase(request)
""",
        encoding="utf-8",
    )

    calls = run_extract(tmp_path, ["client.py"])["model"]["calls"]

    assert [(call["target_service"], call["target_method"]) for call in calls] == [
        ("demo.v1.OrdersService", "GetOrder")
    ]
