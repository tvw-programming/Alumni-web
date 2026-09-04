/**
 * ENTERPRISE / B2B / PRODUCTIVITY COMPONENT LIBRARY (React Native Paper)
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`. Built directly on React
 * Native Paper primitives per the spec's own component guide — `DataTable`,
 * `Card`, `Surface`, `List.Item`, `Chip`, `Avatar`, `Checkbox`,
 * `RadioButton`, `Menu`, `ProgressBar`, `Dialog`/`Portal` (via the shared
 * `AppSheet`), `TextInput`, `Button`, `IconButton`, `SegmentedButtons`.
 *
 * The organising principle from the spec — actionable transparency. Users
 * should know what data they're viewing, which filters are active, who owns
 * the work, what requires attention, what changed, who approved it, and
 * what will happen before they confirm a consequential action:
 *
 *   - `DataTableWrapper` never embeds query logic — sorting, filtering and
 *     pagination are all emitted intents, and a `renderMobileRow` slot
 *     provides a card fallback when columns can't fit
 *   - `KPIStatCard` never assumes "up" is good — a semantic `status` drives
 *     colour, independent of trend direction
 *   - `DashboardChartCard` renders one normalized model through bar, line,
 *     pie or area, and always ships an accessible, tappable data summary
 *     alongside the chart
 *   - `FilterToolbar` exposes the current working filter set as removable
 *     chips, never hiding it behind a menu the user has to reopen
 *   - `TaskListItem` never signals completion by strikethrough alone, and a
 *     sync failure stays visible rather than reverting silently
 *   - `KanbanColumn` / `KanbanCard` provide a real "Move to…" menu, never
 *     making drag-and-drop the only way to move a card
 *   - `ApprovalRequestCard` always requires a reason to reject, and a
 *     request resolved by someone else renders that fact instead of a stale
 *     Approve/Reject pair
 *   - `TimelineActivityFeed` renders actor → action → object → timestamp in
 *     that order, and unread is never a dot or bold weight alone
 *   - `UserRoleChip` / `TeamMemberRow` never render presence as a coloured
 *     dot with no text equivalent
 *   - `NotificationListItem` supports grouped notifications so a noisy
 *     event stream still reads as one honest row
 *   - `FileAttachmentItem` keeps Download and Remove as independent tap
 *     targets, never a combined row-press action
 *   - `ExportSheet` always asks for format and scope before generating
 *     anything, and never claims "Download ready" before the export service
 *     reports a real signed URL
 *   - `AuditLogRow` reads as one coherent sentence and marks a redacted
 *     field "Hidden" in text, never a blank cell
 *   - `MultiStepFormWizard` renders "Step X of Y" as real text and puts an
 *     error summary above the fields it refers to
 */

// Foundations
export * from './theme/enterpriseTokens';
export * from './types';

// Components
export * from './TeamMember';
export * from './TaskListItem';
export * from './Kanban';
export * from './ApprovalRequestCard';
export * from './TimelineActivityFeed';
export * from './NotificationListItem';
export * from './FileAttachmentItem';
export * from './KPIStatCard';
export * from './DashboardChartCard';
export * from './FilterToolbar';
export * from './DataTableWrapper';
export * from './AuditLogRow';
export * from './ExportSheet';
export * from './MultiStepFormWizard';
