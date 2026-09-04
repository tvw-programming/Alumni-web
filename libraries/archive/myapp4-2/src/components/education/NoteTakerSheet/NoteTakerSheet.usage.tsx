/**
 * USAGE — NoteTakerSheet
 *
 * Typing triggers a real autosave cycle (draft → saving → saved), and the
 * "Conflict" case shows both versions with an explicit choice. Nothing here
 * overwrites the learner's text silently.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Note } from '../types/domain';
import { NoteTakerSheet } from './NoteTakerSheet';
import sample from './NoteTakerSheet.sample.json';

const data = loadSample<{
  current: Note;
  conflicted: Note;
  offline: Note;
  readOnly: Note;
  otherNotes: Note[];
}>(sample);

type Key = 'current' | 'conflicted' | 'offline' | 'readOnly';

export const NoteTakerSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [key, setKey] = useState<Key>('current');
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState<Note>(data.current);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNote(data[key]);
  }, [key]);

  /** Debounced autosave — the status text is the feedback, not a Save button. */
  const change = useCallback((patch: Partial<Note>) => {
    setNote((prev) => ({ ...prev, ...patch, status: 'saving' }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setNote((prev) => ({ ...prev, status: 'saved', updatedAt: new Date().toISOString() }));
    }, 800);
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={key}
        onValueChange={(next) => setKey(next as Key)}
        density="small"
        buttons={[
          { value: 'current', label: 'Saved' },
          { value: 'conflicted', label: 'Conflict' },
          { value: 'offline', label: 'Offline' },
          { value: 'readOnly', label: 'Read-only' },
        ]}
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Edit the body and watch the status line: "Saving…" then "Saved just now". A Save button alone would be
        meaningless feedback when autosave is running.
      </Text>

      <AppButton variant="primary" fullWidth onPress={() => setOpen(true)}>
        Open the note sheet
      </AppButton>

      <NoteTakerSheet
        visible={open}
        onDismiss={() => setOpen(false)}
        note={note}
        onChange={change}
        currentTimestampSeconds={412}
        otherNotes={data.otherNotes}
        onAddTimestamp={(seconds) => {
          change({ timestampSeconds: seconds });
          toast.show('Timestamp added');
        }}
        onSeekToTimestamp={(seconds) => toast.show(`Seeking to ${Math.floor(seconds / 60)}:${seconds % 60}`)}
        onOpenNote={(item) => setNote(item)}
        onTogglePin={(item, next) => {
          setNote({ ...item, pinned: next });
          toast.show(next ? 'Note pinned' : 'Note unpinned');
        }}
        onExport={() => toast.success('Exported as Markdown')}
        onDelete={() => {
          setOpen(false);
          toast.show('Note deleted');
        }}
        onKeepMine={() => {
          setNote((prev) => ({ ...prev, status: 'saved', conflictingBody: undefined }));
          toast.success('Kept your version');
        }}
        onKeepLatest={() => {
          setNote((prev) => ({
            ...prev,
            body: prev.conflictingBody ?? prev.body,
            status: 'saved',
            conflictingBody: undefined,
          }));
          toast.success('Kept the newer version');
        }}
        testID="notes"
      />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
