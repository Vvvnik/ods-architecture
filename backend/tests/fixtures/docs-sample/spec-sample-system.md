---
project_id: fixture
analysis_run_id: fixture-run
docs_language: en
---

# Sample system

## Purpose

Fixture root spec for Documentation UI review (015).

## Composition

- `customers` service (see child spec)

## Operation

Main flow for the sample system.

### Schema

```mermaid
flowchart LR
  User --> Gateway
  Gateway --> customers
```
