# Contract: File inventory (один снимок на цикл)

**Спека**: [../spec.md](../spec.md) | **Research**: R1 | Clarify: walk-scope A

## Цель

FR-001 / SC-002: **не более одного** полного обхода WC на цикл
**sync + подготовка анализа**. Sync строит inventory; detector и change-set
только reuse.

## Потребители

| Сервис | До | После |
|--------|----|-------|
| Sync / WC scan | отдельный tree walk | **Единственный** full walk → пишет inventory |
| `LanguageDetectorService` | `walkDirectory` + `listAllFilePaths` | Читает inventory paths |
| `ChangeSetService` | `scanFiles` | current = inventory; vs previous snapshot |
| `AnalysisOrchestratorService` | `listAllFilePaths` | Filtering от inventory / change-set |

## Интерфейс (логический)

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

- **MUST**: один walk записывает inventory (обычно при sync).
- **MUST**: detector и change-set reuse inventory в том же цикле.
- **MUST**: denylist (`ANALYSIS_DETECTOR_DENYLIST`) на этапе walk.
- **MUST NOT**: второй независимый recursive readdir тех же корней в том
  же цикле.
- **MUST NOT** трактовать «отдельный sync walk + shared detect/CS walk»
  как выполнение SC-002.
- **MAY**: переиспользовать sync-snapshot как inventory при совпадении схемы.

## Проверка (DoD)

Счётчик `walk` ≤ 1 на цикл sync+detect+changeset **на fixture large-repo
(≥1000 файлов)**. Unit на меньших WC — регрессия, не закрытие SC-002.
