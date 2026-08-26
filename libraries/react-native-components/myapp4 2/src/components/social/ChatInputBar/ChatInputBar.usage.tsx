/**
 * USAGE — ChatInputBar
 *
 * Voice recording is tap-to-start and tap-to-stop with a visible cancel. Press-
 * and-hold as the only way to record is exactly the pattern that excludes people
 * who cannot hold a steady touch.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Attachment, MessageReference } from '../types/domain';
import { ChatInputBar, type AttachmentOption, type RecordingState } from './ChatInputBar';
import sample from './ChatInputBar.sample.json';

const data = loadSample<{
  attachmentOptions: Omit<AttachmentOption, 'onPress'>[];
  attachments: Record<string, Attachment[]>;
  replyTo: MessageReference;
  disabledReasons: Record<string, string>;
}>(sample);

type Scenario = 'plain' | 'reply' | 'uploading' | 'blocked' | 'slowMode' | 'readOnly';

export const ChatInputBarUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [scenario, setScenario] = useState<Scenario>('plain');
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [recording, setRecording] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [slowMode, setSlowMode] = useState(0);

  useEffect(() => {
    if (recording !== 'recording') return;
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (slowMode <= 0) return;
    const timer = setInterval(() => setSlowMode((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [slowMode]);

  const send = useCallback(
    async (text: string) => {
      setSending(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSending(false);
      setValue('');
      toast.success(`Sent: "${text.slice(0, 28)}${text.length > 28 ? '…' : ''}"`);
      if (scenario === 'slowMode') setSlowMode(20);
    },
    [scenario, toast],
  );

  const options: AttachmentOption[] = data.attachmentOptions.map((option) => ({
    ...option,
    onPress: () => toast.show(`Opening ${option.label.toLowerCase()}`),
  }));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <SegmentedButtons
          value={scenario}
          onValueChange={(next) => setScenario(next as Scenario)}
          density="small"
          buttons={[
            { value: 'plain', label: 'Plain' },
            { value: 'reply', label: 'Reply' },
            { value: 'uploading', label: 'Upload' },
          ]}
        />
        <SegmentedButtons
          value={scenario}
          onValueChange={(next) => setScenario(next as Scenario)}
          density="small"
          buttons={[
            { value: 'blocked', label: 'Blocked file' },
            { value: 'slowMode', label: 'Slow mode' },
            { value: 'readOnly', label: 'Read-only' },
          ]}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Offline
          </Text>
          <Switch value={offline} onValueChange={setOffline} accessibilityLabel="Offline" />
        </View>

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Leave the field empty to see the microphone; type anything and it becomes Send. In the upload scenario, Send
          stays enabled — the file finishes in the background rather than blocking you.
        </Text>
      </ScrollView>

      <ChatInputBar
        value={value}
        onChangeText={setValue}
        onSend={(text) => void send(text)}
        replyTo={scenario === 'reply' ? data.replyTo : undefined}
        onCancelReply={() => setScenario('plain')}
        attachments={
          scenario === 'uploading'
            ? data.attachments.uploading
            : scenario === 'blocked'
              ? data.attachments.blocked
              : undefined
        }
        onRemoveAttachment={(attachment) => toast.show(`Removed ${attachment.name}`)}
        attachmentOptions={options}
        onOpenEmoji={() => toast.show('Opening the emoji picker')}
        onMentionTrigger={() => setValue((prev) => `${prev}@`)}
        recordingState={recording}
        recordingSeconds={seconds}
        onStartRecording={() => {
          setSeconds(0);
          setRecording('recording');
        }}
        onStopRecording={() => {
          setRecording('idle');
          toast.success(`Voice message sent (${seconds}s)`);
        }}
        onCancelRecording={() => {
          setRecording('idle');
          toast.show('Recording discarded');
        }}
        sending={sending}
        offline={offline}
        slowModeSeconds={scenario === 'slowMode' && slowMode > 0 ? slowMode : undefined}
        disabledReason={scenario === 'readOnly' ? data.disabledReasons.readOnly : undefined}
        onTypingChange={(typing) => {
          if (typing) return;
          // A real app publishes this to the presence channel.
        }}
        testID="chat-input"
      />
    </View>
  );
};
