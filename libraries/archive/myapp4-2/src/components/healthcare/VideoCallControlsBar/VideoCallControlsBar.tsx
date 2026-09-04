import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Icon, Menu, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { CallControl, CallControlType, CallQuality } from '../types/domain';

/**
 * Icon pairs. Both halves are needed: an icon that only changes colour between
 * muted and unmuted is unreadable in monochrome and to many users.
 */
const CONTROL_ICONS: Record<CallControlType, { on: string; off: string }> = {
  microphone: { on: 'microphone', off: 'microphone-off' },
  camera: { on: 'video', off: 'video-off' },
  speaker: { on: 'volume-high', off: 'volume-off' },
  chat: { on: 'message-text', off: 'message-text-outline' },
  captions: { on: 'closed-caption', off: 'closed-caption-outline' },
  more: { on: 'dots-horizontal', off: 'dots-horizontal' },
  end: { on: 'phone-hangup', off: 'phone-hangup' },
};

const QUALITY_META: Record<CallQuality, { label: string; icon: string }> = {
  good: { label: 'Good connection', icon: 'signal-cellular-3' },
  fair: { label: 'Fair connection', icon: 'signal-cellular-2' },
  poor: { label: 'Poor connection — try turning off video', icon: 'signal-cellular-1' },
  reconnecting: { label: 'Reconnecting…', icon: 'wifi-sync' },
  unknown: { label: 'Checking connection', icon: 'signal-cellular-outline' },
};

export interface OverflowAction {
  key: string;
  label: string;
  icon?: string;
  onPress: () => void;
}

export interface VideoCallControlsBarProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  controls: CallControl[];
  onToggle: (control: CallControl) => void;
  onEnd: () => void;
  /** Extra items for the "More" menu on narrow screens. */
  overflowActions?: OverflowAction[];
  quality?: CallQuality;
  /** Elapsed seconds. Formatted here, tracked by the call service. */
  elapsedSeconds?: number;
  /** Shown when recording is active — disclosure is not optional. */
  recording?: boolean;
  audioOnly?: boolean;
  /** Waiting-room mode hides in-call controls that do nothing yet. */
  waitingRoom?: boolean;
  interpreterAvailable?: boolean;
  onRequestInterpreter?: () => void;
}

const formatElapsed = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * The in-call control bar.
 *
 * Media state lives in the call/session service — this bar receives current
 * state and emits intent, so a muted microphone is muted because the SDK says
 * so, not because a local boolean got flipped.
 *
 * `End call` is separated from the toggle row by a gap and rendered in its own
 * colour, because an accidental hang-up mid-consultation is a real harm.
 */
export const VideoCallControlsBar = ({
  controls,
  onToggle,
  onEnd,
  overflowActions = [],
  quality = 'unknown',
  elapsedSeconds,
  recording = false,
  audioOnly = false,
  waitingRoom = false,
  interpreterAvailable = false,
  onRequestInterpreter,
  style,
  containerStyle,
  testID,
}: VideoCallControlsBarProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  const qualityMeta = QUALITY_META[quality];

  const visible = useMemo(
    () => controls.filter((control) => control.type !== 'end' && (!audioOnly || control.type !== 'camera')),
    [audioOnly, controls],
  );

  const renderControl = useCallback(
    (control: CallControl) => {
      const denied = control.permission === 'denied';
      const disabled = !control.enabled || denied;
      const icons = CONTROL_ICONS[control.type];
      const isOn = control.active !== false;
      const iconName = isOn ? icons.on : icons.off;

      return (
        <View key={control.id} style={styles.controlWrap}>
          <TouchableRipple
            onPress={() => onToggle(control)}
            disabled={disabled}
            borderless
            style={[
              styles.control,
              {
                width: health.layout.callControlSize,
                height: health.layout.callControlSize,
                borderRadius: theme.radii.pill,
                backgroundColor: isOn ? 'rgba(255,255,255,0.16)' : health.colors.callControlActive,
                opacity: disabled ? 0.4 : 1,
              },
            ]}
            // The label states the ACTION and changes with state.
            accessibilityRole="button"
            accessibilityLabel={control.label}
            accessibilityState={{ disabled, selected: !isOn }}
            accessibilityHint={denied ? 'Permission denied. Enable it in Settings.' : undefined}
            testID={childTestID(testID, `control-${control.type}`)}
          >
            <View style={styles.center}>
              <Icon source={iconName} size={24} color={health.colors.onCallSurface} />
            </View>
          </TouchableRipple>

          {control.badgeCount ? (
            <Badge size={16} style={styles.badge}>
              {control.badgeCount}
            </Badge>
          ) : null}

          {/* A short text label under every icon — icon-only bars are guesswork. */}
          <Text
            variant="labelSmall"
            style={{ color: health.colors.onCallSurface, opacity: 0.8, marginTop: 2 }}
            numberOfLines={1}
          >
            {denied ? 'Blocked' : isOn ? 'On' : 'Off'}
          </Text>
        </View>
      );
    },
    [health.colors, health.layout.callControlSize, onToggle, testID, theme.radii.pill],
  );

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: health.colors.callSurface,
          paddingBottom: insets.bottom + theme.spacing.sm,
          paddingTop: theme.spacing.sm,
        },
        containerStyle,
        style,
      ]}
      testID={testID}
    >
      <View style={[styles.statusRow, { paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }]}>
        <Icon source={qualityMeta.icon} size={14} color={health.colors.onCallSurface} />
        <Text
          variant="labelSmall"
          style={{ color: health.colors.onCallSurface, flex: 1 }}
          accessibilityLiveRegion="polite"
          numberOfLines={1}
        >
          {qualityMeta.label}
        </Text>

        {recording ? (
          <View style={[styles.row, { gap: 4 }]}>
            <Icon source="record-circle" size={12} color={health.colors.callEnd} />
            {/* Recording disclosure is always visible while recording. */}
            <Text variant="labelSmall" style={{ color: health.colors.onCallSurface }}>
              Recording
            </Text>
          </View>
        ) : null}

        {elapsedSeconds != null ? (
          <Text
            variant="labelSmall"
            style={[styles.tabular, { color: health.colors.onCallSurface }]}
            accessibilityLabel={`Call duration ${formatElapsed(elapsedSeconds)}`}
          >
            {formatElapsed(elapsedSeconds)}
          </Text>
        ) : null}
      </View>

      {waitingRoom ? (
        <Text
          variant="bodySmall"
          style={{ color: health.colors.onCallSurface, textAlign: 'center', paddingHorizontal: theme.spacing.md }}
        >
          You are in the waiting room. Your clinician will join shortly.
        </Text>
      ) : null}

      {interpreterAvailable && onRequestInterpreter ? (
        <TouchableRipple
          onPress={onRequestInterpreter}
          accessibilityRole="button"
          accessibilityLabel="Request an interpreter"
          style={{ alignSelf: 'center', padding: theme.spacing.xs }}
          testID={childTestID(testID, 'interpreter')}
        >
          <View style={[styles.row, { gap: 4 }]}>
            <Icon source="translate" size={14} color={health.colors.onCallSurface} />
            <Text variant="labelSmall" style={{ color: health.colors.onCallSurface }}>
              Request an interpreter
            </Text>
          </View>
        </TouchableRipple>
      ) : null}

      <View style={[styles.controls, { paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }]}>
        {visible.map(renderControl)}

        {overflowActions.length > 0 ? (
          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <View style={styles.controlWrap}>
                <TouchableRipple
                  onPress={() => setMenuOpen(true)}
                  borderless
                  style={[
                    styles.control,
                    {
                      width: health.layout.callControlSize,
                      height: health.layout.callControlSize,
                      borderRadius: theme.radii.pill,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="More call options"
                  testID={childTestID(testID, 'control-more')}
                >
                  <View style={styles.center}>
                    <Icon source="dots-horizontal" size={24} color={health.colors.onCallSurface} />
                  </View>
                </TouchableRipple>
                <Text variant="labelSmall" style={{ color: health.colors.onCallSurface, opacity: 0.8, marginTop: 2 }}>
                  More
                </Text>
              </View>
            }
          >
            {overflowActions.map((action) => (
              <Menu.Item
                key={action.key}
                onPress={() => {
                  setMenuOpen(false);
                  action.onPress();
                }}
                title={action.label}
                leadingIcon={action.icon}
                testID={childTestID(testID, `overflow-${action.key}`)}
              />
            ))}
          </Menu>
        ) : null}
      </View>

      {/* Deliberate separation from the toggles above. */}
      <View style={{ height: theme.spacing.md }} />

      <TouchableRipple
        onPress={onEnd}
        borderless
        style={[
          styles.endButton,
          { backgroundColor: health.colors.callEnd, borderRadius: theme.radii.pill, marginHorizontal: theme.spacing.xl },
        ]}
        accessibilityRole="button"
        accessibilityLabel={waitingRoom ? 'Leave the waiting room' : 'End the call'}
        testID={childTestID(testID, 'control-end')}
      >
        <View style={[styles.row, styles.center, { gap: theme.spacing.xs, paddingVertical: theme.spacing.sm }]}>
          <Icon source="phone-hangup" size={20} color="#FFFFFF" />
          <Text variant="labelLarge" style={{ color: '#FFFFFF' }}>
            {waitingRoom ? 'Leave' : 'End call'}
          </Text>
        </View>
      </TouchableRipple>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' },
  controlWrap: { alignItems: 'center' },
  control: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  badge: { position: 'absolute', top: -2, right: -2 },
  endButton: { overflow: 'hidden' },
  tabular: { fontVariant: ['tabular-nums'] },
});
