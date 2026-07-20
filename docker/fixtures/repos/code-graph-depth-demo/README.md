# Demo: code-graph-depth (008)

Minimal C# + TypeScript project for validating
`008-code-graph-depth`: `calls` edges and, for C#, `injects` edges in the portal graph.

## Structure

```text
csharp/
  Repo.cs       — Save method
  Service.cs    — constructor DI (Repo) + Create() calls _repo.Save()
typescript/
  save.ts       — export function save()
  create.ts     — create() calls save() (cross-file)
```

## Expected result after analysis (008)

| Language | Expected on the Graph screen |
|------|------------------------------|
| C# | `calls`: `Sample.Service.Create` → `Sample.Repo.Save` |
| C# | `injects`: `Sample.Service` → `Sample.Repo` |
| TS | `calls`: `create` → `save` |

## Git setup

```bash
./docker/fixtures/repos/setup-fixtures.sh
```

## Import

**Docker (`full`):**

```text
source_type: local_path
source_value: /repos/code-graph-depth-demo
```

**Host:**

```text
source_value: <repo>/docker/fixtures/repos/code-graph-depth-demo
```

After sync → confirm C# and TypeScript → wait for analysis → open Graph / search for `Create`, `Save`, and `calls`.
