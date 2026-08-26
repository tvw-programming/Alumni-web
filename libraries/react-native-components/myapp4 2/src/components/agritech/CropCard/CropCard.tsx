import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Badge, Icon, IconButton, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { Crop } from '../types/domain';

export interface CropCardProps extends StyleEscapeHatches {
  crop: Crop;
  variant?: 'standard' | 'compact' | 'dashboard';
  onPress: (crop: Crop) => void;
  onViewAdvisory?: (crop: Crop) => void;
  onConfirmStage?: (crop: Crop) => void;
}

const STAGE_LABEL: Record<string, string> = {
  sown: 'Sown',
  germination: 'Germination',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  harvestReady: 'Harvest ready',
};

/**
 * A stage badge is always rendered as text, never colour alone, and a
 * `stageStatus` of "inferred" or "unknown" is always visible next to the
 * stage chip — a farmer-confirmed stage and a system guess never look the
 * same. Sowing date, days-since-sowing, and next action come only from the
 * crop record; no agronomic inference happens inside this component.
 */
export const CropCard = ({ crop, variant = 'standard', onPress, onViewAdvisory, onConfirmStage, style, containerStyle, testID }: CropCardProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `crop-${crop.id}`;
  const compact = variant === 'compact';
  const stageLabel = crop.stage ? (STAGE_LABEL[crop.stage] ?? crop.stage) : undefined;
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <AppCard variant="outlined" onPress={() => onPress(crop)} containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.xs }}>
        <View style={styles.row}>
          {!compact ? (
            <View style={[styles.thumb, { borderRadius: theme.radii.sm, backgroundColor: agri.colors.surfaceVariant }]}>
              {crop.imageUri?.uri && !imageFailed ? (
                <Image source={{ uri: crop.imageUri.uri }} style={styles.thumbImg} onError={() => setImageFailed(true)} accessibilityLabel={crop.imageUri.alt ?? `${crop.name} field photo`} />
              ) : (
                <Icon source="sprout-outline" size={22} color={agri.colors.onSurfaceVariant} />
              )}
            </View>
          ) : null}
          <View style={[styles.flex, compact ? undefined : { marginLeft: theme.spacing.sm }]}>
            <View style={styles.row}>
              <Text variant="titleSmall" style={styles.flex}>
                {crop.name}
                {crop.variety ? ` · ${crop.variety}` : ''}
              </Text>
              {crop.alertCount ? <Badge size={18}>{crop.alertCount}</Badge> : null}
            </View>
            {crop.fieldName ? (
              <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
                {crop.fieldName}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.row}>
          {stageLabel ? (
            <View
              style={[
                styles.stageChip,
                {
                  borderRadius: theme.radii.pill,
                  backgroundColor: crop.stageOverdue ? theme.colors.errorContainer : agri.colors.surfaceVariant,
                },
              ]}
            >
              <Text variant="labelSmall" style={{ color: crop.stageOverdue ? theme.colors.onErrorContainer : theme.colors.onSurface }}>
                {stageLabel}
              </Text>
            </View>
          ) : null}
          {crop.stageStatus === 'inferred' || crop.stageStatus === 'unknown' ? (
            <View style={styles.row}>
              <Icon source="help-circle-outline" size={12} color={agri.colors.stageInferred} />
              <Text variant="labelSmall" style={{ color: agri.colors.stageInferred, marginLeft: 3 }}>
                Stage needs confirmation
              </Text>
            </View>
          ) : null}
        </View>

        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
          {crop.sowingDate
            ? `Sown ${crop.sowingDate}${crop.daysSinceSowing != null ? ` · ${crop.daysSinceSowing} days ago` : ''}`
            : 'Sowing date missing'}
        </Text>

        {crop.nextAction ? (
          <View style={styles.row}>
            <Icon source="arrow-right-thin" size={13} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ marginLeft: 4, flex: 1 }}>
              Next: {crop.nextAction}
            </Text>
          </View>
        ) : !crop.stage ? (
          <Text variant="bodySmall" style={{ color: agri.colors.onSurfaceVariant }}>
            No crop data yet.
          </Text>
        ) : null}

        {crop.stageOverdue ? (
          <View style={styles.row}>
            <Icon source="alert-outline" size={12} color={agri.colors.stageOverdue} />
            <Text variant="labelSmall" style={{ color: agri.colors.stageOverdue, marginLeft: 4 }}>
              Stage is overdue for review
            </Text>
          </View>
        ) : null}

        <View style={styles.row}>
          {onViewAdvisory ? (
            <IconButton icon="book-open-variant" size={16} onPress={() => onViewAdvisory(crop)} accessibilityLabel="View crop advisory" style={styles.noMargin} testID={childTestID(id, 'advisory')} />
          ) : null}
          {onConfirmStage && crop.stageStatus !== 'confirmed' ? (
            <IconButton icon="check-decagram-outline" size={16} onPress={() => onConfirmStage(crop)} accessibilityLabel="Confirm crop stage" style={styles.noMargin} testID={childTestID(id, 'confirm')} />
          ) : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  thumb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: 44, height: 44 },
  stageChip: { paddingHorizontal: 10, paddingVertical: 3 },
  noMargin: { margin: 0 },
});
