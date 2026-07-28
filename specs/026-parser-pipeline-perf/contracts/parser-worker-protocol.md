# Contract: Parser worker protocol (`ods-worker`)

**Spec**: [../spec.md](../spec.md) | **Research**: R1 | **Data model**: parser worker session

## Goal

Within one analysis run, process multiple file chunks for the same
`parser_id` without a new OS process per chunk.

## Discovery

- Orchestrator probes support: pass `--ods-worker` (or manifest
  `supports_ods_worker: true`). If the process exits immediately with
  “unknown flag” / non-zero before ready, fall back to **oneshot** CLI for
  that `parser_id` (log once). Prefer explicit manifest flag to avoid flaky
  probes.

## Process lifecycle

1. Spawn: same `manifest.command` + `--ods-worker` + shared ids
   (`--project-id`, `--working-copy-root`, `--analysis-run-id` as today).
2. Worker prints one NDJSON line `{"op":"ready"}` on stdout when accepting work.
3. For each chunk, orchestrator writes one NDJSON request on stdin, waits
   for matching response.
4. Orchestrator writes `{"op":"shutdown"}`; worker exits 0.

`stdio`: stdin pipe (not ignored); stdout = protocol; stderr = logs.

## Request / response (NDJSON, one object per line)

### Request: chunk

```json
{
  "op": "chunk",
  "chunk_index": 0,
  "file_list": "/tmp/.../files.txt",
  "output": "/tmp/.../envelope.json"
}
```

### Response: chunk ok

```json
{
  "op": "chunk_result",
  "chunk_index": 0,
  "status": "ok",
  "output": "/tmp/.../envelope.json"
}
```

### Response: chunk error

```json
{
  "op": "chunk_result",
  "chunk_index": 0,
  "status": "error",
  "message": "human-readable"
}
```

### Shutdown

Request: `{"op":"shutdown"}`  
Response (optional): `{"op":"bye"}` then exit.

## Semantics

- Envelope on disk MUST match oneshot CLI shape for the same file list.
- Timeout: if no `chunk_result` within `ANALYSIS_PARSER_TIMEOUT_MS`, kill
  session; mark job failed/partial per existing rules.
- On run cancel: shutdown or kill; no orphan processes.
- Progress N/M MAY update per chunk (existing `progress_*` fields) — **not**
  duration fields.

## DoD modules (minimum)

`typescript`, `csharp`, `java` language parsers MUST support `--ods-worker`
for SC-004. Others MAY remain oneshot in the same release.

## Non-goals

- Cross-run warm pools
- Shared worker across different `parser_id`s
- Timing fields in protocol
