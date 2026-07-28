# Ingest: `grpc-proto`

**parser_id**: `grpc-proto`  
**schema_version**: `1`  
**Native**: [native-grpc-proto.schema.json](./native-grpc-proto.schema.json)

## Transform

For each `services[]` entry and each `methods[]` entry:

1. Build `method_key = {package}.{Service}/{Method}` (omit empty package
   segment cleanly; no double dots).
2. Upsert node:
   - `kind = grpc_method`
   - `id = grpc-proto:grpc_method:{method_key}`
   - `metadata.layer = system`, `metadata.protocol = grpc`
   - `path = source_path`, `language = protobuf`
3. Upsert edge `documents`:
   - `from` = stable contract id derived from `source_path`
     (e.g. `grpc-proto:contract:{source_path}`) **or** omit separate contract
     node and use a synthetic from-id documented in adapter (MUST be stable)
   - `to` = method id
   - `metadata.protocol = grpc`
4. If `service_hint` uniquely matches an existing `service` node id for the
   project/run, upsert `exposes` service → method with `metadata.protocol =
   grpc`. Otherwise skip `exposes` (methods still exist).

## Errors

Invalid/empty proto file set → adapter receives empty `services` or parser
exits partial/error per module policy; orchestrator does not fail the whole
run solely for this module when other modules succeed.
