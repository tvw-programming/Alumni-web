import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, Icon, Searchbar, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppSheet } from '@ui/organisms/AppSheet';
import { StateView } from '@ui/molecules/StateView';
import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useDebouncedValue, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { Note, NoteStatus } from '../types/domain';

const STATUS_META: Record<NoteStatus, { label: string; icon: string }> = {
  draft: { label: 'Not saved yet', icon: 'pencil-outline' },
  saving: { label: 'Saving…', icon: 'cloud-sync-outline' },
  saved: { label: 'Saved just now', icon: 'cloud-check-outline' },
  offline: { label: 'Changes saved offline', icon: 'cloud-off-outline' },
  conflict: { label: 'Newer version found', icon: 'source-branch' },
  error: { label: "Couldn't save", icon: 'cloud-alert' },
};

export const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export interface NoteTakerSheetProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  visible: boolean;
  onDismiss: () => void;
  note: Note;
  onChange: (patch: Partial<Note>) => void;
  /** Current video position, so a timestamp can be inserted. */
  currentTimestampSeconds?: number;
  onAddTimestamp?: (seconds: number) => void;
  onSeekToTimestamp?: (seconds: number) => void;
  onDelete?: (note: Note) => void;
  onExport?: (note: Note) => void;
  onTogglePin?: (note: Note, next: boolean) => void;
  /** Conflict resolution — never resolved silently. */
  onKeepMine?: () => void;
  onKeepLatest?: () => void;
  /** Other notes for this lesson, with search. */
  otherNotes?: Note[];
  onOpenNote?: (note: Note) => void;
  locale?: string;
}

/**
 * Lesson notes in a sheet.
 *
 * Autosave state is always visible ("Saving…" / "Saved just now" / "Changes
 * saved offline") because a Save button that does nothing is worse than no
 * button. A sync conflict is surfaced with both versions and an explicit choice
 * — the one thing this component will never do is silently overwrite what the
 * learner wrote.
 */
export const NoteTakerSheet = ({
  visible,
  onDismiss,
  note,
  onChange,
  currentTimestampSeconds,
  onAddTimestamp,
  onSeekToTimestamp,
  onDelete,
  onExport,
  onTogglePin,
  onKeepMine,
  onKeepLatest,
  otherNotes = [],
  onOpenNote,
  locale = 'en-IN',
  animated = true,
  style,
  containerStyle,
  testID,
}: NoteTakerSheetProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const confirm = useConfirm();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);
  const [showList, setShowList] = useState(false);

  const id = testID ?? 'note-sheet';
  const status = STATUS_META[note.status];
  const conflict = note.status === 'conflict';

  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) return otherNotes;
    const q = debouncedQuery.toLowerCase();
    return otherNotes.filter(
      (item) => item.title?.toLowerCase().includes(q) || item.body.toLowerCase().includes(q),
    );
  }, [debouncedQuery, otherNotes]);

  const handleDelete = useCallback(async () => {
    const ok = await confirm({
      title: 'Delete this note?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) onDelete?.(note);
  }, [confirm, note, onDelete]);

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      snapPoints={[0.7, 0.95]}
      scrollable
      animated={animated}
      containerStyle={containerStyle}
      style={style}
      testID={id}
      header={
        <View style={{ padding: theme.spacing.md, gap: 4 }}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="titleSmall" numberOfLines={1}>
                {showList ? 'Your notes' : (note.title || 'Take a note')}
              </Text>
              {note.lessonTitle ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {note.lessonTitle}
                </Text>
              ) : null}
            </View>

            {onTogglePin && !showList ? (
              <TouchableRipple
                onPress={() => onTogglePin(note, !note.pinned)}
                borderless
                style={{ padding: 8, borderRadius: 20 }}
                accessibilityRole="button"
                accessibilityLabel={note.pinned ? 'Unpin this note' : 'Pin this note'}
                accessibilityState={{ selected: !!note.pinned }}
                testID={childTestID(id, 'pin')}
              >
                <Icon
                  source={note.pinned ? 'pin' : 'pin-outline'}
                  size={18}
                  color={note.pinned ? learn.colors.rewardAccent : theme.colors.onSurfaceVariant}
                />
              </TouchableRipple>
            ) : null}

            {otherNotes.length > 0 ? (
              <TouchableRipple
                onPress={() => setShowList((prev) => !prev)}
                borderless
                style={{ padding: 8, borderRadius: 20 }}
                accessibilityRole="button"
                accessibilityLabel={showList ? 'Back to this note' : `Browse your ${otherNotes.length} notes`}
                testID={childTestID(id, 'browse')}
              >
                <Icon source={showList ? 'pencil-outline' : 'format-list-bulleted'} size={18} color={theme.colors.onSurfaceVariant} />
              </TouchableRipple>
            ) : null}
          </View>

          {/* Autosave state is always visible next to the title. */}
          {!showList ? (
            <View style={[styles.row, { gap: 4 }]} accessibilityLiveRegion="polite">
              {note.status === 'saving' ? (
                <ActivityIndicator size={11} />
              ) : (
                <Icon
                  source={status.icon}
                  size={12}
                  color={
                    note.status === 'error' || conflict
                      ? learn.colors.statusOverdue
                      : note.status === 'offline'
                        ? learn.colors.statusLate
                        : theme.colors.onSurfaceVariant
                  }
                />
              )}
              <Text
                variant="labelSmall"
                style={{
                  color:
                    note.status === 'error' || conflict
                      ? learn.colors.statusOverdue
                      : theme.colors.onSurfaceVariant,
                }}
              >
                {status.label}
                {note.status === 'saved' ? ` · ${formatRelativeDate(note.updatedAt, locale)}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      }
    >
      {showList ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Searchbar
            value={query}
            onChangeText={setQuery}
            placeholder="Search your notes"
            style={{ borderRadius: theme.radii.md }}
            inputStyle={{ minHeight: 0 }}
            testID={childTestID(id, 'search')}
          />
          {filtered.length === 0 ? (
            <StateView preset="noResults" compact title="No notes match" description="Try a different search." />
          ) : (
            filtered.map((item) => (
              <TouchableRipple
                key={item.id}
                onPress={() => {
                  onOpenNote?.(item);
                  setShowList(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.title ?? 'Untitled note'}${
                  item.timestampSeconds != null ? ` at ${formatTimestamp(item.timestampSeconds)}` : ''
                }. ${item.body.slice(0, 80)}`}
                testID={childTestID(id, `note-${item.id}`)}
              >
                <View style={{ paddingVertical: theme.spacing.sm, gap: 2 }}>
                  <View style={[styles.row, { gap: 4 }]}>
                    {item.pinned ? <Icon source="pin" size={12} color={learn.colors.rewardAccent} /> : null}
                    <Text variant="labelMedium" style={styles.flex} numberOfLines={1}>
                      {item.title ?? 'Untitled note'}
                    </Text>
                    {item.timestampSeconds != null ? (
                      <Text variant="labelSmall" style={{ color: learn.colors.statusInProgress }}>
                        {formatTimestamp(item.timestampSeconds)}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Divider style={{ marginTop: theme.spacing.xs }} />
                </View>
              </TouchableRipple>
            ))
          )}
        </View>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {/* A conflict is presented with both versions and an explicit choice. */}
          {conflict ? (
            <View
              style={[
                styles.conflict,
                { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.md, padding: theme.spacing.sm, gap: theme.spacing.xs },
              ]}
              testID={childTestID(id, 'conflict')}
            >
              <Text variant="labelMedium">We found a newer version of this note</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                It was edited on another device. Nothing has been overwritten.
              </Text>
              {note.conflictingBody ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={4}>
                  Newer version: {note.conflictingBody}
                </Text>
              ) : null}
              <View style={[styles.row, { gap: theme.spacing.sm }]}>
                <AppButton variant="secondary" size="sm" containerStyle={styles.flex} onPress={onKeepMine} testID={childTestID(id, 'keep-mine')}>
                  Keep my version
                </AppButton>
                <AppButton variant="secondary" size="sm" containerStyle={styles.flex} onPress={onKeepLatest} testID={childTestID(id, 'keep-latest')}>
                  Keep latest version
                </AppButton>
              </View>
            </View>
          ) : null}

          <AppTextInput
            label="Title (optional)"
            value={note.title ?? ''}
            onChangeText={(title) => onChange({ title })}
            disabled={note.readOnly}
            testID={childTestID(id, 'title')}
          />

          <AppTextInput
            label="Your note"
            value={note.body}
            onChangeText={(body) => onChange({ body })}
            multiline
            numberOfLines={8}
            disabled={note.readOnly}
            showCounter
            maxLength={5000}
            testID={childTestID(id, 'body')}
          />

          {note.readOnly ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              This note is read-only — it was shared by your instructor.
            </Text>
          ) : null}

          <View style={[styles.actions, { gap: theme.spacing.sm }]}>
            {onAddTimestamp && currentTimestampSeconds != null && !note.readOnly ? (
              <AppButton
                variant="ghost"
                size="sm"
                icon="clock-plus-outline"
                onPress={() => onAddTimestamp(currentTimestampSeconds)}
                testID={childTestID(id, 'timestamp')}
              >
                {`Add timestamp ${formatTimestamp(currentTimestampSeconds)}`}
              </AppButton>
            ) : null}

            {note.timestampSeconds != null && onSeekToTimestamp ? (
              <AppButton
                variant="ghost"
                size="sm"
                icon="play-circle-outline"
                onPress={() => onSeekToTimestamp(note.timestampSeconds as number)}
                testID={childTestID(id, 'seek')}
              >
                {`Jump to ${formatTimestamp(note.timestampSeconds)}`}
              </AppButton>
            ) : null}

            {onExport ? (
              <AppButton variant="ghost" size="sm" icon="export-variant" onPress={() => onExport(note)} testID={childTestID(id, 'export')}>
                Export
              </AppButton>
            ) : null}

            {onDelete && !note.readOnly ? (
              <AppButton variant="ghost" size="sm" icon="delete-outline" onPress={() => void handleDelete()} testID={childTestID(id, 'delete')}>
                Delete
              </AppButton>
            ) : null}
          </View>
        </View>
      )}
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  conflict: {},
  flex: { flex: 1 },
});
