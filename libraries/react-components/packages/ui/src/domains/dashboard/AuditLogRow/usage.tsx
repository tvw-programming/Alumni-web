import List from '@mui/material/List';

import { AuditLogRow, type AuditEvent } from './AuditLogRow';
import sample from './sample.json';

export function AuditLogRowUsage() {
  // Read-only by construction. An audit trail the UI can modify is not an
  // audit trail.
  const event = sample.event as AuditEvent;
  return (
    <List disablePadding>
      <AuditLogRow event={event} />
    </List>
  );
}
