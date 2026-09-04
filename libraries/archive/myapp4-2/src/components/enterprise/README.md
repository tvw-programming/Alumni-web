# Enterprise / B2B / Productivity Component Library (React Native Paper)

Domain layer for workspace productivity: data tables, dashboards, filters,
tasks, kanban boards, approvals, activity feeds, teams, notifications,
files, exports, audit logs, and multi-step forms. Built directly on **React
Native Paper** primitives per the spec's own component guide — `DataTable`,
`Card`, `List.Item`, `Chip`, `Avatar`, `Checkbox`, `RadioButton`, `Menu`,
`ProgressBar`, `SegmentedButtons`, and `Dialog`/`Portal` via the shared
`AppSheet` — layered on top of the base library in `src/components/`.

## Folder structure

```
src/components/enterprise/
├── theme/enterpriseTokens.ts   # surface/background, priority*, audit*, trend*, unread, selected
├── types/domain.ts             # WorkspaceTask, TaskCardData, ApprovalRequest, AuditLogEvent, …
│
├── TeamMember/                 # UserRoleChip + TeamMemberRow — built first, reused across the domain
├── TaskListItem/
├── Kanban/                     # KanbanColumn + KanbanCard
├── ApprovalRequestCard/
├── TimelineActivityFeed/
├── NotificationListItem/
├── FileAttachmentItem/
├── KPIStatCard/
├── DashboardChartCard/
├── FilterToolbar/
├── DataTableWrapper/
├── AuditLogRow/
├── ExportSheet/
└── MultiStepFormWizard/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Workspace UI** tab
renders them directly, so an example that drifts from its component fails
the typecheck.

## Reused from the base and other domains

- **`ImageAsset`** (`@ui/primitives/media`) — avatars across `TeamMember`,
  `TaskListItem`, `ApprovalRequestCard`, and `TimelineActivityFeed` share
  the exact shape every other domain's media fields use.
- **`AppSheet`** (`@ui/organisms`) — backs `FilterToolbar`'s filter editor,
  `ApprovalRequestCard`'s reject-reason dialog, `AuditLogRow`'s detail
  sheet, and `ExportSheet` — the same Portal-based primitive every other
  domain's dialogs and sheets use.
- **`FilterChipGroup`** (`@ui/molecules`) — powers `FilterToolbar`'s
  multi-select and single-select filter editors.
- **`UserRoleChip`** / **`TeamMemberRow`** are composed wherever a person or
  role needs to render — `TaskListItem`'s assignee avatar, `KanbanCard`'s
  assignee stack, and `ApprovalRequestCard`'s requester block all draw from
  the same `UserSummary` shape.

## The one rule

> Actionable transparency. Users should know what data they're viewing,
> which filters are active, who owns the work, what requires attention,
> what changed, who approved it, and what will happen before they confirm a
> consequential action.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `DataTableWrapper` | Embed query logic — sorting, filtering and pagination are always emitted as intents to a server-side query layer. |
| `KPIStatCard` | Assume "up" is good — a semantic `status` (positive/warning/negative/neutral), not trend direction, drives colour. |
| `DashboardChartCard` | Lock a critical value behind a chart-only gesture — every chart ships an accessible, tappable text summary. |
| `FilterToolbar` | Hide the active filter set behind a menu — every applied filter renders as a visible, removable chip. |
| `TaskListItem` | Signal completion by strikethrough alone, or silently revert a failed sync — a sync error stays visible as its own state. |
| `KanbanColumn` / `KanbanCard` | Make drag-and-drop the only way to move a card — "Move to…" is a real menu action. |
| `ApprovalRequestCard` | Let a reject fire with no reason, or leave a stale Approve/Reject pair on a request someone else already resolved. |
| `TimelineActivityFeed` | Signal unread with a dot or bold weight alone — the accessible label states "Unread" explicitly. |
| `UserRoleChip` / `TeamMemberRow` | Render presence or role as colour with no text equivalent. |
| `NotificationListItem` | Render a flood of individual events when the notification service already grouped them — `groupCount` renders one honest row. |
| `FileAttachmentItem` | Combine Download and Remove into one row-press action — they're always independent tap targets. |
| `ExportSheet` | Start generating before format and scope are chosen, or claim "Download ready" before a real signed URL exists. |
| `AuditLogRow` | Hide a redacted field as a blank cell — it always says "Hidden" in text. |
| `MultiStepFormWizard` | Make the visual step indicator the only way to track progress — "Step X of Y" is always real text, and the error summary sits above the fields it refers to. |

## Cross-cutting standards

**Never colour alone.** Priority, KPI status, audit severity, presence, and
unread state all pair an icon or text label with any colour.

**Domain components stay thin.** `DataTableWrapper` never sorts or
paginates locally against a full dataset; `ExportSheet` never validates
permissions or generates a file; `ApprovalRequestCard` never enforces
quorum or delegation rules. Every `*.usage.tsx` owns the simulated async
delay that stands in for these services.

**Optimistic updates always have a way back.** `TaskListItem`'s checkbox
toggle renders an indeterminate in-flight state and a visible `syncError`
rather than silently reverting on failure.

**Mobile fallbacks for desktop-shaped data.** `DataTableWrapper` accepts a
`renderMobileRow` slot so the same normalized rows can render as cards when
columns don't fit a narrow screen, per the spec's own guidance.

## Tokens

`design-tokens/enterprise.tokens.json` — light and dark, semantic names
only: `background`/`surface`/`surfaceVariant`, `focus`/`selected`/`unread`,
`priorityUrgent`/`High`/`Medium`/`Low`/`None`, `auditNormal`/`Security`/
`Critical`, `trendUp`/`Down`/`Flat`.

Read them with `useWorkspaceTheme()`. No component in this folder accepts a
hex value.

## Usage

```tsx
import { DataTableWrapper, TaskListItem, ApprovalRequestCard } from '@ui/enterprise';

<TaskListItem
  task={task}
  onToggle={(item) => toggleTask(item.id)}   // caller owns optimistic update + rollback
  onPress={(item) => openTaskDetail(item.id)}
/>
```

See the running app's **Workspace UI** tab for all fourteen, or read any
`*.usage.tsx` for the same examples in source form.
