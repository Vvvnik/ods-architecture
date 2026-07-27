#!/usr/bin/env python3
"""Python parser module — stdlib ast, native model v1."""

from __future__ import annotations

import ast
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args(argv: list[str]) -> dict[str, str]:
    args: dict[str, str] = {}
    index = 0
    while index < len(argv):
        key = argv[index]
        if not key.startswith("--"):
            index += 1
            continue
        name = key[2:]
        if index + 1 >= len(argv):
            break
        args[name] = argv[index + 1]
        index += 2
    return args


def posix_path(path: str) -> str:
    return path.replace("\\", "/")


def module_qualified_name(relative_path: str) -> str:
    path = Path(relative_path)
    if path.name == "__init__.py":
        parent = path.parent
        return parent.as_posix().replace("/", ".") if parent.as_posix() != "." else ""
    stem = path.stem
    if path.parent.as_posix() not in (".", ""):
        return f"{path.parent.as_posix().replace('/', '.')}.{stem}"
    return stem


def to_location(node: ast.AST) -> dict[str, int]:
    return {
        "start_line": getattr(node, "lineno", 1),
        "start_col": getattr(node, "col_offset", 0),
        "end_line": getattr(node, "end_line", getattr(node, "lineno", 1)),
        "end_col": getattr(node, "end_col_offset", 0),
    }


def resolve_import_module(
    importer_path: str,
    module: str | None,
    level: int,
    working_copy_root: Path,
) -> str | None:
    importer = Path(importer_path)
    base_dir = working_copy_root / importer.parent

    if level > 0:
        package_dir = base_dir
        for _ in range(level - 1):
            package_dir = package_dir.parent
        if module:
            module_path = package_dir / module.replace(".", "/")
        else:
            module_path = package_dir
    elif module:
        module_path = working_copy_root / module.replace(".", "/")
    else:
        return None

    candidates = [
        module_path.with_suffix(".py"),
        module_path / "__init__.py",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return posix_path(str(candidate.relative_to(working_copy_root)))
    return None


def import_ref(node: ast.Import | ast.ImportFrom, importer_path: str, working_copy_root: Path) -> list[dict[str, Any]]:
    refs: list[dict[str, Any]] = []

    if isinstance(node, ast.Import):
        for alias in node.names:
            target_path = resolve_import_module(importer_path, alias.name, 0, working_copy_root)
            refs.append(
                {
                    "type": "imports",
                    "name": alias.asname or alias.name.split(".")[-1],
                    "kind": "module",
                    "qualified_name": alias.name,
                    **({"path": target_path} if target_path else {}),
                }
            )
        return refs

    module_name = node.module or ""
    target_path = resolve_import_module(importer_path, module_name, node.level, working_copy_root)
    for alias in node.names:
        if alias.name == "*":
            refs.append(
                {
                    "type": "imports",
                    "name": module_name.split(".")[-1] if module_name else "*",
                    "kind": "module",
                    "qualified_name": module_name,
                    **({"path": target_path} if target_path else {}),
                }
            )
            continue

        qualified = f"{module_name}.{alias.name}" if module_name else alias.name
        refs.append(
            {
                "type": "imports",
                "name": alias.asname or alias.name,
                "kind": "module",
                "qualified_name": qualified,
                **({"path": target_path} if target_path else {}),
            }
        )
    return refs


def collect_import_refs(nodes: list[ast.AST], importer_path: str, working_copy_root: Path) -> list[dict[str, Any]]:
    refs: list[dict[str, Any]] = []
    for node in nodes:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            refs.extend(import_ref(node, importer_path, working_copy_root))
    return refs


def function_signature(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    args = []
    all_args = list(node.args.posonlyargs) + list(node.args.args) + list(node.args.kwonlyargs)
    for arg in all_args:
        args.append(arg.arg)
    if node.args.vararg:
        args.append(f"*{node.args.vararg.arg}")
    if node.args.kwarg:
        args.append(f"**{node.args.kwarg.arg}")
    return f"({', '.join(args)})"


def analyze_file(relative_path: str, absolute_path: Path, working_copy_root: Path) -> list[dict[str, Any]]:
    source = absolute_path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(absolute_path))
    module_qname = module_qualified_name(relative_path)
    symbols: list[dict[str, Any]] = []

    module_symbol = {
        "name": Path(relative_path).name,
        "kind": "module",
        "path": relative_path,
        "qualified_name": module_qname or Path(relative_path).stem,
        "location": to_location(tree),
        "refs": collect_import_refs(tree.body, relative_path, working_copy_root),
    }
    symbols.append(module_symbol)

    class_stack: list[str] = []

    def qualify(name: str) -> str:
        parts = [part for part in class_stack if part]
        if module_qname:
            parts.insert(0, module_qname)
        parts.append(name)
        return ".".join(parts)

    def parent_qualified() -> str | None:
        parts = [part for part in class_stack if part]
        if module_qname:
            parts.insert(0, module_qname)
        return ".".join(parts) if parts else module_qname

    def visit_body(body: list[ast.stmt]) -> None:
        for node in body:
            if isinstance(node, ast.ClassDef):
                class_stack.append(node.name)
                qualified = qualify(node.name)
                symbols.append(
                    {
                        "name": node.name,
                        "kind": "class",
                        "path": relative_path,
                        "qualified_name": qualified,
                        "parent_qualified_name": parent_qualified(),
                        "location": to_location(node),
                        "refs": collect_import_refs(node.body, relative_path, working_copy_root),
                    }
                )
                visit_body(node.body)
                class_stack.pop()
                continue

            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                qualified = qualify(node.name)
                symbols.append(
                    {
                        "name": node.name,
                        "kind": "function",
                        "path": relative_path,
                        "qualified_name": qualified,
                        "parent_qualified_name": parent_qualified(),
                        "signature": function_signature(node),
                        "location": to_location(node),
                        "refs": collect_import_refs(node.body, relative_path, working_copy_root),
                    }
                )
                continue

            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        qualified = qualify(target.id)
                        symbols.append(
                            {
                                "name": target.id,
                                "kind": "variable",
                                "path": relative_path,
                                "qualified_name": qualified,
                                "parent_qualified_name": parent_qualified(),
                                "location": to_location(node),
                            }
                        )

    visit_body(tree.body)
    return symbols


def main() -> int:
    args = parse_args(sys.argv[1:])
    required = ["project-id", "working-copy-root", "analysis-run-id", "output"]
    for key in required:
        if key not in args:
            print(f"Missing required argument: --{key}", file=sys.stderr)
            return 1
    if "files" not in args and "file-list" not in args:
        print("Missing required argument: --files or --file-list", file=sys.stderr)
        return 1

    working_copy_root = Path(args["working-copy-root"])
    if "files" in args:
        files = json.loads(args["files"])
    else:
        files = [line.strip() for line in Path(args["file-list"]).read_text(encoding="utf-8").splitlines() if line.strip()]
    symbols: list[dict[str, Any]] = []

    for file_path in files:
        relative_path = posix_path(file_path)
        absolute_path = working_copy_root / relative_path
        if not absolute_path.is_file():
            continue
        symbols.extend(analyze_file(relative_path, absolute_path, working_copy_root))

    envelope = {
        "parser_id": "python",
        "schema_version": "1",
        "project_id": args["project-id"],
        "analysis_run_id": args["analysis-run-id"],
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "files_analyzed": [posix_path(path) for path in files],
        "model": {"symbols": symbols},
    }

    output_path = Path(args["output"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(envelope, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
