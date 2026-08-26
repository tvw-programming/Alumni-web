import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Portal, Surface, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { GameControl, GameControlType } from '../types/domain';

const CONTROL_ICON: Record<GameControlType, { on: string; off: string }> = {
  pause: { on: 'pause', off: 'play' },
  sound: { on: 'volume-high', off: 'volume-off' },
  settings: { on: 'cog-outline', off: 'cog-outline' },
  captions: { on: 'closed-caption', off: 'closed-caption-outline' },
  exit: { on: 'exit-to-app', off: 'exit-to-app' },
  restart: { on: 'restart', off: 'restart' },
};

export interface GameControlsOverlayProps extends StyleEscapeHatches {
  visible: boolean;
  controls: GameControl[];
  autoHideMs?: number;
  reducedMotion?: boolean;
  onControl: (controlId: string) => void;
  onRequestHide?: () => void;
}

/**
 * Every control is a real `IconButton` with an explicit `accessibilityLabel`
 * and `accessibilityState` — nothing here is a bare icon relying on shape or
 * position alone. Pause, save-checkpoint and exit rules live outside this
 * overlay; it only ever reports which control id was pressed.
 */
export const GameControlsOverlay = ({ visible, controls, autoHideMs, reducedMotion = false, onControl, onRequestHide, style, containerStyle, testID }: GameControlsOverlayProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'game-controls-overlay';
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!visible || !autoHideMs || !onRequestHide) return;
    hideTimer.current = setTimeout(onRequestHide, autoHideMs);
    return () => clearTimeout(hideTimer.current);
  }, [visible, autoHideMs, onRequestHide]);

  if (!visible) return null;

  return (
    <Portal>
      <View style={[StyleSheet.absoluteFill, styles.wrapper]} pointerEvents="box-none" testID={id}>
        <Surface
          elevation={4}
          style={[styles.bar, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill }, containerStyle, style]}
        >
          {controls.map((control) => {
            const icons = CONTROL_ICON[control.type];
            const iconName = control.type === 'pause' || control.type === 'sound' || control.type === 'captions' ? (control.active ? icons.on : icons.off) : icons.on;
            return (
              <View key={control.id} style={styles.controlWrap}>
                <IconButton
                  icon={iconName}
                  size={24}
                  disabled={!control.enabled}
                  onPress={() => onControl(control.id)}
                  accessibilityLabel={control.label}
                  accessibilityState={{ disabled: !control.enabled, selected: control.active }}
                  testID={childTestID(id, control.id)}
                />
              </View>
            );
          })}
        </Surface>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  wrapper: { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 24 },
  bar: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4 },
  controlWrap: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
