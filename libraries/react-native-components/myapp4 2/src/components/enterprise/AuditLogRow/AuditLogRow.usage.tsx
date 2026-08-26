/**
 * USAGE — AuditLogRow
 *
 * Row 3's deleted contract value is marked "Hidden" rather than shown blank
 * or omitted — a redacted field always says so in text.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AuditLogEvent } from '../types/domain';
import { AuditLogRow } from './AuditLogRow';
import sample from './AuditLogRow.sample.json';

const { events } = loadSample<{ events: AuditLogEvent[] }>(sample);

export const AuditLogRowUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {events.map((event, index) => (
        <React.Fragment key={event.id}>
          <AuditLogRow event={event} onCopyEventId={(item) => toast.success(`Copied event ID ${item.id}`)} />
          {index < events.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
