#!/usr/bin/env python3
"""Extract statically resolvable httpx, requests, and aiohttp calls."""

from __future__ import annotations

import ast
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}


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


def static_string(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr) and all(isinstance(value, ast.Constant) for value in node.values):
        return "".join(str(value.value) for value in node.values)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left = static_string(node.left)
        right = static_string(node.right)
        return f"{left}{right}" if left is not None and right is not None else None
    return None


def dotted_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parent = dotted_name(node.value)
        return f"{parent}.{node.attr}" if parent else node.attr
    if isinstance(node, ast.Call):
        return dotted_name(node.func)
    return None


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


def constructor_base_url(call: ast.Call) -> str | None:
    for keyword in call.keywords:
        if keyword.arg in {"base_url", "base"}:
            return static_string(keyword.value)
    return None


def collect_bindings(tree: ast.AST) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    aliases: dict[str, str] = {}
    instances: dict[str, str] = {}
    base_urls: dict[str, str] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name in {"httpx", "requests", "aiohttp"}:
                    aliases[alias.asname or alias.name] = alias.name
        elif isinstance(node, ast.ImportFrom) and node.module in {"httpx", "requests", "aiohttp"}:
            for alias in node.names:
                aliases[alias.asname or alias.name] = node.module
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            value = node.value
            if not isinstance(value, ast.Call):
                continue
            constructor = dotted_name(value.func) or ""
            kind = next((name for name in ("httpx", "requests", "aiohttp") if constructor.startswith(f"{name}.")), None)
            if not kind:
                root = constructor.split(".", 1)[0]
                kind = aliases.get(root)
            if kind:
                for target in targets:
                    if isinstance(target, ast.Name):
                        instances[target.id] = kind
                        base_url = constructor_base_url(value)
                        if base_url:
                            base_urls[target.id] = base_url
        elif isinstance(node, (ast.With, ast.AsyncWith)):
            for item in node.items:
                if not isinstance(item.context_expr, ast.Call) or not isinstance(item.optional_vars, ast.Name):
                    continue
                constructor = dotted_name(item.context_expr.func) or ""
                root = constructor.split(".", 1)[0]
                kind = aliases.get(root, root if root in {"httpx", "requests", "aiohttp"} else "")
                if kind:
                    instances[item.optional_vars.id] = kind
                    base_url = constructor_base_url(item.context_expr)
                    if base_url:
                        base_urls[item.optional_vars.id] = base_url
    return aliases, instances, base_urls


def analyze_file(relative_path: str, absolute_path: Path) -> list[dict[str, Any]]:
    try:
        tree = ast.parse(absolute_path.read_text(encoding="utf-8"), filename=str(absolute_path))
    except (OSError, SyntaxError, UnicodeDecodeError):
        return []
    aliases, instances, base_urls = collect_bindings(tree)
    calls: list[dict[str, Any]] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute) or not node.args:
            continue
        method = node.func.attr.lower()
        if method not in HTTP_METHODS:
            continue
        url = static_string(node.args[0])
        if url is None or not (url.startswith("/") or url.startswith("http://") or url.startswith("https://")):
            continue

        receiver = node.func.value
        receiver_name = dotted_name(receiver) or ""
        root_name = receiver_name.split(".", 1)[0]
        kind = aliases.get(root_name) or instances.get(root_name)
        if not kind and isinstance(receiver, ast.Call):
            constructor = dotted_name(receiver.func) or ""
            constructor_root = constructor.split(".", 1)[0]
            kind = aliases.get(constructor_root, constructor_root if constructor_root in {"httpx", "requests", "aiohttp"} else None)
        if kind not in {"httpx", "requests", "aiohttp"}:
            continue

        call: dict[str, Any] = {
            "method": method.upper(),
            "source_path": relative_path,
            "client_kind": kind,
            "service_hint": caller_hint(relative_path),
            "location": location(node),
        }
        if url.startswith("/"):
            call["path"] = url
            base_url = base_urls.get(root_name)
            hostname = urlparse(base_url).hostname if base_url else None
            if hostname:
                call["callee_service_hint"] = hostname
        else:
            call["url"] = url
            hostname = urlparse(url).hostname
            if hostname:
                call["callee_service_hint"] = hostname
        calls.append(call)
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
        "parser_id": "python-http-calls",
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
