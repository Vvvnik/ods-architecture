# UI-contract: code-drill "Graph view" (012)

**Spec**: [spec.md](../spec.md)  
**API**: [openapi-graph-view-code.yaml](./openapi-graph-view-code.yaml)  
**Basis UI**: `specs/011-ods-graph-viewer/contracts/graph-view-ui.md`

## Menus / Routes

No changes to the item names `011`.  
Route: `/projects/:projectId/graph-view`

### Query (delta)

| Param | Meaning |
|-------|----------|
| `focus` | id Focus; No = System |
| `layer` | `system` (default) \| `code` |
| `resolve_from` | id from the analysis; code → exact_code |

## Layout

How `011` (canvas + inspector + breadcrumbs). Optional:

- the path is reflected in the breadcrumbs, including the transition to code;
- banner `truncated` / `no_related_code` via portal i18n.

## Interaction (delta)

| Action | Result |
|----------|-----------|
| Log in to service from the System | `focus=service`, `layer=system` (interior `011`) |
| Inspector **"Into the code"** | `focus=service`, `layer=code` |
| Double-click / "Log in" to service | **not** opens code (only system) |
| Log in to module/type/method | `focus=<id>` (code-cut) |
| Enter the external neighbor | `focus=<neighbor>` (any component) |
| "To the system" | `focus` cleared, `layer=system` |
| "Open in the diagram" (code in the analysis) | `/graph-view?resolve_from=<codeId>` → focus on code |
| "Open in the diagram" (system) | like `011` |

Click = selection + inspector; the focus changes only the "Log in" / double-click /
"Into the code."

## Empty / banners

| Situation | UI |
|----------|-----|
| `empty_reason=no_related_code` | "Linked code not found" + stay in the context of the service / return |
| `resolve_status=exact_code` | without the banner "code do not show" |
| `resolve_status=system_fallback` | banner fallback as `011` (if code focus impossible) |
| `truncated` | banner truncation (as `011`) |

## i18n (mandatory key)

- `graphView.enterCode` - "In code"
- `graphView.emptyNoRelatedCode` — explanation empty code
- update/remove text that code does not show on the diagram in MVP (for
  successful exact_code)

## Outside scope UI

- Search on View
- Edit canon
- Mixing of "system-"children and "code-"modules on the first login screen
