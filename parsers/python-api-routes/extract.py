#!/usr/bin/env python3
"""Extract static FastAPI, Flask, and Django routes from Python source."""

from __future__ import annotations

import ast
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HTTP_METHODS = {"get", "post", "put", "patch", "delete"}


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
    return None


def service_hint(relative_path: str) -> str | None:
    parts = Path(relative_path).parts
    return parts[0] if len(parts) > 1 else None


def handler_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "as_view":
        return handler_name(node.func.value)
    return None


def route_path(prefix: str, path: str, regex: bool = False) -> str:
    value = path
    if regex:
        value = value.removeprefix("^").removesuffix("$")
    combined = f"{prefix.rstrip('/')}/{value.lstrip('/')}"
    return combined if combined.startswith("/") else f"/{combined}"


def decorator_routes(tree: ast.AST, relative_path: str) -> list[dict[str, Any]]:
    routes: list[dict[str, Any]] = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call) or not isinstance(decorator.func, ast.Attribute):
                continue
            owner = decorator.func.value
            if not isinstance(owner, ast.Name) or not decorator.args:
                continue
            path = static_string(decorator.args[0])
            if path is None:
                continue
            owner_name = owner.id
            method_name = decorator.func.attr.lower()
            if owner_name in {"app", "router"} and method_name in HTTP_METHODS:
                routes.append(
                    {
                        "method": method_name.upper(),
                        "path": route_path("", path),
                        "source_path": relative_path,
                        "handler_name": node.name,
                        "service_hint": service_hint(relative_path),
                        "path_complete": True,
                        "framework": "fastapi",
                    }
                )
            elif method_name == "route" and (owner_name == "app" or owner_name == "bp" or "blueprint" in owner_name.lower()):
                methods = ["GET"]
                for keyword in decorator.keywords:
                    if keyword.arg != "methods" or not isinstance(keyword.value, (ast.List, ast.Tuple)):
                        continue
                    values = [static_string(item) for item in keyword.value.elts]
                    methods = [value.upper() for value in values if value]
                for method in methods:
                    routes.append(
                        {
                            "method": method,
                            "path": route_path("", path),
                            "source_path": relative_path,
                            "handler_name": node.name,
                            "service_hint": service_hint(relative_path),
                            "path_complete": True,
                            "framework": "flask",
                        }
                    )
    return routes


def module_to_path(module: str, root: Path) -> str | None:
    base = root / module.replace(".", "/")
    for candidate in (base.with_suffix(".py"), base / "__init__.py"):
        if candidate.is_file():
            return candidate.relative_to(root).as_posix()
    return None


def included_modules(tree: ast.AST, root: Path) -> set[str]:
    paths: set[str] = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or handler_name(node.func) != "include" or not node.args:
            continue
        module = static_string(node.args[0])
        resolved = module_to_path(module, root) if module else None
        if resolved:
            paths.add(resolved)
    return paths


def django_routes(
    relative_path: str,
    root: Path,
    prefix: str = "",
    visited: frozenset[str] = frozenset(),
) -> list[dict[str, Any]]:
    if relative_path in visited:
        return []
    absolute_path = root / relative_path
    try:
        tree = ast.parse(absolute_path.read_text(encoding="utf-8"), filename=str(absolute_path))
    except (OSError, SyntaxError, UnicodeDecodeError):
        return []

    pattern_nodes: list[ast.AST] = []
    for node in tree.body:
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        if not any(isinstance(target, ast.Name) and target.id == "urlpatterns" for target in targets):
            continue
        value = node.value
        if isinstance(value, (ast.List, ast.Tuple)):
            pattern_nodes.extend(value.elts)

    routes: list[dict[str, Any]] = []
    for item in pattern_nodes:
        if not isinstance(item, ast.Call) or not item.args:
            continue
        func_name = handler_name(item.func)
        if func_name not in {"path", "re_path"}:
            continue
        path = static_string(item.args[0])
        if path is None or len(item.args) < 2:
            continue
        target = item.args[1]
        if isinstance(target, ast.Call) and handler_name(target.func) == "include":
            if not target.args:
                continue
            module = static_string(target.args[0])
            included_path = module_to_path(module, root) if module else None
            if included_path:
                routes.extend(
                    django_routes(
                        included_path,
                        root,
                        route_path(prefix, path, func_name == "re_path"),
                        visited | {relative_path},
                    )
                )
            continue
        routes.append(
            {
                "method": "GET",
                "path": route_path(prefix, path, func_name == "re_path"),
                "source_path": relative_path,
                "handler_name": handler_name(target),
                "service_hint": service_hint(relative_path),
                "path_complete": True,
                "framework": "django",
            }
        )
    return routes


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
    routes: list[dict[str, Any]] = []
    parsed_files: list[tuple[str, ast.AST]] = []
    for relative_path in files:
        absolute_path = root / relative_path
        if not absolute_path.is_file():
            continue
        try:
            tree = ast.parse(absolute_path.read_text(encoding="utf-8"), filename=str(absolute_path))
        except (OSError, SyntaxError, UnicodeDecodeError):
            continue
        parsed_files.append((relative_path, tree))

    include_targets = {
        included_path
        for _, tree in parsed_files
        for included_path in included_modules(tree, root)
    }
    for relative_path, tree in parsed_files:
        routes.extend(decorator_routes(tree, relative_path))
        if relative_path not in include_targets:
            routes.extend(django_routes(relative_path, root))

    envelope = {
        "parser_id": "python-api-routes",
        "schema_version": "1",
        "project_id": args["project-id"],
        "analysis_run_id": args["analysis-run-id"],
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "files_analyzed": files,
        "model": {"routes": routes},
    }
    output = Path(args["output"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(envelope, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
