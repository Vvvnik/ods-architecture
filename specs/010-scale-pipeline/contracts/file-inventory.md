# Contract: File inventory (one snapshot per cycle)

**Spec**: [../spec.md](../spec.md) | **Research**: R1 | Clarify: walk-scope A

## Goal

FR-001 / SC-002: **no more than one** full bypass WC per cycle
**sync + analysis preparation**. Sync builds inventory; detector and change-set
Only reuse.

## Consumers

| Service | Before | After |
|--------|----|-------|
| Sync / WC scan | separate tree walk | **The only** full walk → writes inventory |
| `LanguageDetectorService` | `walkDirectory` + `listAllFilePaths` | Reads inventory paths |
| `ChangeSetService` | `scanFiles` | current = inventory; vs previous snapshot |
| `AnalysisOrchestratorService` | `listAllFilePaths` | Filtering from inventory / change-set |

## Interface (logical)

```ts
interface FileInventoryEntry {
  path: string;
  mtime_ms: number;
  size: number;
}

interface FileInventory {
  project_id: string;
  captured_at: string; // ISO
  files: FileInventoryEntry[];
  source: 'sync_walk' | 'reuse';
}
```

## MUST / MUST NOT

- **MUST**: one walk records inventory (usually in sync).
- **MUST**: detector and change-set reuse inventory in the same cycle.
- **MUST**: denylist (`ANALYSIS_DETECTOR_DENYLIST`) in phase walk.
- **MUST NOT** second independent recursive readdir same roots in
  the same cycle.
- **MUST NOT** interpret "individual sync walk + shared detect/CS walk"
  how to execute SC-002.
- **MAY**: reuse sync-snapshot as inventory at the coincidence scheme.

## Verification (DoD)

Counter `walk` ≤ 1 cycle sync+detect+changeset **on fixture large-repo
(≥1000 files)**. Unit on smaller WC — regression, not closing SC-002.
