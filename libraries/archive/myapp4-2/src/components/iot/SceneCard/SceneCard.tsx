import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { SceneExecution, SmartScene } from '../types/domain';

export interface SceneCardProps extends StyleEscapeHatches {
  scene: SmartScene;
  execution?: SceneExecution;
  onRun: (scene: SmartScene) => void;
  onEdit?: (scene: SmartScene) => void;
  onTest?: (scene: SmartScene) => void;
  onMore?: (scene: SmartScene) => void;
}

/**
 * A scene never claims "completed" when only some devices responded — a
 * `partial` execution renders its own honest state, naming which devices
 * didn't respond where that data is available. Running is optimistic for
 * the *initiation* only; the card never assumes final device state before
 * the execution result comes back.
 */
export const SceneCard = ({ scene, execution, onRun, onEdit, onTest, onMore, style, containerStyle, testID }: SceneCardProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `scene-${scene.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const running = execution?.status === 'running';
  const partial = execution?.status === 'partial';
  const failed = execution?.status === 'error';

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: iot.colors.surfaceVariant }]}>
            <Icon source={scene.icon ?? 'star-four-points-outline'} size={20} color={iot.colors.onSurfaceVariant} />
          </View>
          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <Text variant="titleSmall">{scene.name}</Text>
            {scene.description ? (
              <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }} numberOfLines={2}>
                {scene.description}
              </Text>
            ) : null}
          </View>
          {(onEdit || onMore) ? (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${scene.name}`} style={styles.noMargin} testID={childTestID(id, 'menu')} />}
            >
              {onEdit ? <Menu.Item onPress={() => { setMenuVisible(false); onEdit(scene); }} title="Edit scene" leadingIcon="pencil-outline" /> : null}
              {onTest ? <Menu.Item onPress={() => { setMenuVisible(false); onTest(scene); }} title="Test scene" leadingIcon="flask-outline" /> : null}
            </Menu>
          ) : null}
        </View>

        <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
          {scene.deviceCount} device{scene.deviceCount === 1 ? '' : 's'}
          {scene.lastRunAt ? ` · Last ran ${scene.lastRunAt}` : ''}
        </Text>

        {running ? (
          <View style={styles.row}>
            <ActivityIndicator size={14} />
            <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant, marginLeft: 6 }} accessibilityLiveRegion="polite">
              Scene running…
            </Text>
          </View>
        ) : execution?.status === 'success' ? (
          <View style={styles.row}>
            <Icon source="check-circle" size={13} color={iot.colors.online} />
            <Text variant="labelSmall" style={{ color: iot.colors.online, marginLeft: 4 }}>
              Scene completed
            </Text>
          </View>
        ) : partial ? (
          <View style={styles.row}>
            <Icon source="alert-outline" size={13} color={iot.colors.warning} />
            <Text variant="labelSmall" style={{ color: iot.colors.warning, marginLeft: 4 }}>
              Some devices did not respond{execution?.failedDeviceIds ? ` (${execution.failedDeviceIds.length})` : ''}
            </Text>
          </View>
        ) : failed ? (
          <View style={styles.row}>
            <Icon source="close-circle-outline" size={13} color={iot.colors.error} />
            <Text variant="labelSmall" style={{ color: iot.colors.error, marginLeft: 4 }}>
              Scene couldn't run
            </Text>
          </View>
        ) : null}

        <AppButton variant="primary" size="sm" loading={running} onPress={() => onRun(scene)} testID={childTestID(id, 'run')}>
          Run scene
        </AppButton>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
});
