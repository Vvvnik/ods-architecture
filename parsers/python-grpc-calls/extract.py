#!/usr/bin/env python3
"""Extract statically resolvable Python gRPC unary call sites."""

from __future__ import annotations

import ast
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RPC_METHOD = re.compile(r"^[A-Z][A-Za-z0-9]*$")
SERVICE_CLASS = re.compile(r"([A-Z][A-Za-z0-9]*Service)(?:Stub|Client)?$")


def parse_args(argv: list[str]) -> dict[str, str]:
    args: dict[str, str] = {}
    index = 0
    while index < len(argv):
        key = argv[index]
        if key.startswith("--") and index + 1 < len(argv):
            args[key[2:]] = argv[index + 1]
            index += 2
        else:
            index += 1
    return args


def dotted_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parent = dotted_name(node.value)
        return f"{parent}.{node.attr}" if parent else node.attr
    return None


def service_from_name(name: str, package: str | None) -> str | None:
    match = SERVICE_CLASS.search(name)
    if not match:
        return None
    service = match.group(1)
    return f"{package}.{service}" if package else service


def package_from_module(module: str) -> str | None:
    """Strip generated stub modules (*_pb2 / *_pb2_grpc); keep protobuf package path."""
    if not module:
        return None
    package_parts: list[str] = []
    for part in module.split("."):
        if not part:
            continue
        if part.endswith("_pb2") or part.endswith("_pb2_grpc"):
            break
        package_parts.append(part)
    package = ".".join(package_parts)
    return package or None


def annotation_name(annotation: ast.AST | None) -> str | None:
    return dotted_name(annotation) if annotation else None


def caller_hint(relative_path: str) -> str | None:
    parts = Path(relative_path).parts
    return parts[0] if len(parts) > 1 else None


def location(node: ast.AST) -> dict[str, int]:
    return {
        "start_line": getattr(node, "lineno", 1),
        "start_col": getattr(node, "col_offset", 0),
        "end_line": getattr(node, "end_lineno", getattr(node, "lineno", 1)),
        "end_col": getattr(node, "end_col_offset", 0),
    }


def analyze_file(relative_path: str, absolute_path: Path) -> list[dict[str, Any]]:
    try:
        tree = ast.parse(absolute_path.read_text(encoding="utf-8"), filename=str(absolute_path))
    except (OSError, SyntaxError, UnicodeDecodeError):
        return []

    packages: dict[str, str | None] = {}
    imported_services: dict[str, str] = {}
    variables: dict[str, str] = {}
    assigns: list[tuple[list[ast.AST], ast.AST | None, ast.AST | None]] = []
    call_nodes: list[ast.Call] = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                packages[alias.asname or alias.name.split(".")[0]] = package_from_module(alias.name)
        elif isinstance(node, ast.ImportFrom):
            package = package_from_module(node.module or "")
            for alias in node.names:
                local_name = alias.asname or alias.name
                packages[local_name] = package
                service = service_from_name(alias.name, package)
                if service:
                    imported_services[local_name] = service
        elif isinstance(node, ast.Assign):
            assigns.append((node.targets, node.value, None))
        elif isinstance(node, ast.AnnAssign):
            assigns.append(([node.target], node.value, node.annotation))
        elif isinstance(node, ast.Call):
            call_nodes.append(node)

    for targets, value, annotation in assigns:
        constructor = dotted_name(value.func) if isinstance(value, ast.Call) else None
        type_name = annotation_name(annotation) or constructor or ""
        simple_name = type_name.rsplit(".", 1)[-1]
        package = packages.get(type_name.split(".", 1)[0])
        service = imported_services.get(simple_name) or service_from_name(simple_name, package)
        if not service:
            continue
        for target in targets:
            if isinstance(target, ast.Name):
                variables[target.id] = service

    calls: list[dict[str, Any]] = []
    for node in call_nodes:
        if not isinstance(node.func, ast.Attribute):
            continue
        method = node.func.attr
        if not RPC_METHOD.fullmatch(method):
            continue
        receiver = dotted_name(node.func.value)
        if not receiver:
            continue
        root = receiver.split(".", 1)[0]
        target_service = variables.get(root)
        if not target_service:
            target_service = service_from_name(receiver, packages.get(root))
        if not target_service:
            continue
        calls.append(
            {
                "target_service": target_service,
                "target_method": method,
                "source_path": relative_path,
                "service_hint": caller_hint(relative_path),
                "location": location(node),
            }
        )
    return calls


def selected_files(args: dict[str, str]) -> list[str]:
    if "files" in args:
        raw = json.loads(args["files"])
    else:
        raw = Path(args["file-list"]).read_text(encoding="utf-8").splitlines()
    return [str(path).replace("\\", "/") for path in raw if Path(str(path)).suffix.lower() in {".py", ".pyw"}]


def main() -> int:
    args = parse_args(sys.argv[1:])
    required = {"project-id", "working-copy-root", "analysis-run-id", "output"}
    missing = sorted(required - args.keys())
    if missing or ("files" not in args and "file-list" not in args):
        detail = ", ".join(f"--{name}" for name in missing) or "--files or --file-list"
        print(f"Missing required argument: {detail}", file=sys.stderr)
        return 1

    root = Path(args["working-copy-root"])
    files = selected_files(args)
    calls: list[dict[str, Any]] = []
    for relative_path in files:
        absolute_path = root / relative_path
        if absolute_path.is_file():
            calls.extend(analyze_file(relative_path, absolute_path))

    envelope = {
        "parser_id": "python-grpc-calls",
        "schema_version": "1",
        "project_id": args["project-id"],
        "analysis_run_id": args["analysis-run-id"],
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "files_analyzed": files,
        "model": {"calls": calls},
    }
    output = Path(args["output"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(envelope, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
