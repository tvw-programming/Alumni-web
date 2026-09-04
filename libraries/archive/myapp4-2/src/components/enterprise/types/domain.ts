import type { ImageAsset } from '@ui/primitives/media';

/** Freshness metadata threaded through every remote-sourced reading. */
export interface RemoteMeta {
  lastUpdatedAt?: string;
  source?: string;
  freshness?: 'fresh' | 'stale' | 'unknown';
  requestId?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  avatar?: ImageAsset;
  email?: string;
}

// ---------------------------------------------------------------------------
// 9. UserRoleChip / TeamMemberRow (built first — reused across the domain)
// ---------------------------------------------------------------------------

export type RoleTone = 'neutral' | 'admin' | 'manager' | 'member' | 'guest' | 'custom';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type MembershipStatus = 'active' | 'invited' | 'pending' | 'suspended' | 'deactivated';

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  avatar?: ImageAsset;
  role?: string;
  roleTone?: RoleTone;
  presence?: PresenceStatus;
  status?: MembershipStatus;
}

// ---------------------------------------------------------------------------
// 5. TaskListItem
// ---------------------------------------------------------------------------

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface SubtaskProgress {
  complete: number;
  total: number;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  completed: boolean;
  priority?: TaskPriority;
  assignee?: UserSummary;
  dueDate?: string;
  subtaskCount?: SubtaskProgress;
  status?: string;
  syncError?: boolean;
  locked?: boolean;
}

// ---------------------------------------------------------------------------
// 6. KanbanColumn / KanbanCard
// ---------------------------------------------------------------------------

export interface TaskCardData {
  id: string;
  identifier?: string;
  title: string;
  labels?: string[];
  priority?: TaskPriority;
  assignees?: UserSummary[];
  dueDate?: string;
  checklist?: SubtaskProgress;
  attachmentCount?: number;
  commentCount?: number;
}

export interface KanbanColumnData {
  id: string;
  title: string;
  limit?: number;
  cards: TaskCardData[];
}

// ---------------------------------------------------------------------------
// 7. ApprovalRequestCard
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'reassigned' | 'expired';

export interface ApprovalRequest {
  id: string;
  title: string;
  requester: UserSummary;
  submittedAt: string;
  amount?: string;
  summary?: string;
  status: ApprovalStatus;
  dueAt?: string;
  approvers?: UserSummary[];
  resolvedBy?: UserSummary;
  resolvedNote?: string;
}

// ---------------------------------------------------------------------------
// 8. TimelineActivityFeed
// ---------------------------------------------------------------------------

export interface ActivityAction {
  key: string;
  label: string;
}

export interface ActivityEntity {
  id: string;
  type: string;
  label: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  actor?: UserSummary;
  timestamp: string;
  title: string;
  description?: string;
  entity?: ActivityEntity;
  read: boolean;
  actions?: ActivityAction[];
}

// ---------------------------------------------------------------------------
// 10. NotificationListItem
// ---------------------------------------------------------------------------

export type NotificationPriority = 'normal' | 'important' | 'urgent';

export interface WorkspaceNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  timestamp: string;
  actor?: UserSummary;
  read: boolean;
  priority?: NotificationPriority;
  entity?: ActivityEntity;
  groupCount?: number;
}

// ---------------------------------------------------------------------------
// 11. FileAttachmentItem
// ---------------------------------------------------------------------------

export type FileStatus = 'available' | 'uploading' | 'downloading' | 'error' | 'expired';

export interface FileAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  uri?: string;
  status: FileStatus;
  progress?: number;
}

// ---------------------------------------------------------------------------
// 2. KPIStatCard
// ---------------------------------------------------------------------------

export type KpiTrend = 'up' | 'down' | 'flat' | 'neutral';
export type KpiStatus = 'positive' | 'warning' | 'negative' | 'neutral';

export interface KPIStat {
  label: string;
  value: string | number;
  previousValue?: string | number;
  delta?: number;
  deltaLabel?: string;
  trend?: KpiTrend;
  target?: number;
  periodLabel?: string;
  status?: KpiStatus;
  sparkline?: number[];
}

// ---------------------------------------------------------------------------
// 3. DashboardChartCard
// ---------------------------------------------------------------------------

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

export interface ChartDatum {
  id: string;
  label: string;
  value: number;
  colorToken?: string;
}

export interface LegendItem {
  id: string;
  label: string;
  colorToken: string;
}

// ---------------------------------------------------------------------------
// 4. FilterToolbar
// ---------------------------------------------------------------------------

export type FilterType = 'dateRange' | 'multiSelect' | 'singleSelect' | 'search' | 'boolean';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
}

export type FilterValue = string | string[] | boolean | { start?: string; end?: string } | undefined;
export type FilterValues = Record<string, FilterValue>;

// ---------------------------------------------------------------------------
// 1. DataTableWrapper
// ---------------------------------------------------------------------------

export type SortDirection = 'asc' | 'desc';

export interface TableSort {
  key: string;
  direction: SortDirection;
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
}

// ---------------------------------------------------------------------------
// 12. ExportSheet
// ---------------------------------------------------------------------------

export type ExportFormatId = 'csv' | 'pdf' | 'xlsx' | 'json';

export interface ExportFormat {
  id: ExportFormatId;
  label: string;
  description?: string;
  available: boolean;
}

export interface ExportScopeOption {
  id: string;
  label: string;
}

export interface ExportConfig {
  formatId: ExportFormatId;
  scopeId?: string;
  includeAttachments: boolean;
}

export type ExportStatus = 'idle' | 'generating' | 'complete' | 'failed' | 'queued';

// ---------------------------------------------------------------------------
// 13. AuditLogRow
// ---------------------------------------------------------------------------

export type AuditAction = 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'exported' | 'permissionChanged';
export type AuditSeverity = 'normal' | 'security' | 'critical';

export interface AuditFieldChange {
  field: string;
  before?: string;
  after?: string;
  redacted?: boolean;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  timezoneLabel?: string;
  actor?: UserSummary;
  action: AuditAction;
  entityType: string;
  entityLabel: string;
  changes?: AuditFieldChange[];
  source?: string;
  ipOrDeviceLabel?: string;
  severity?: AuditSeverity;
}

// ---------------------------------------------------------------------------
// 14. MultiStepFormWizard
// ---------------------------------------------------------------------------

export interface WizardStepMeta {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

export type WizardStatus = 'idle' | 'validating' | 'saving' | 'submitting' | 'success' | 'error';
