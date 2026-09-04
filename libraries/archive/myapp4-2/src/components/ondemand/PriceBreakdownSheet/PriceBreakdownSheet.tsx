import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppSheet } from '@ui/organisms/AppSheet';
import { MoneyRow } from '@ui/molecules/MoneyRow';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { PriceBreakdown, PriceLine } from '../types/domain';

const LINE_EMPHASIS: Record<PriceLine['type'], 'default' | 'savings' | 'muted'> = {
  base: 'default',
  fee: 'default',
  tax: 'muted',
  discount: 'savings',
  credit: 'savings',
  tip: 'default',
  deposit: 'muted',
};

export interface PriceBreakdownSheetProps extends StyleEscapeHatches {
  breakdown: PriceBreakdown;
  locale?: string;
  /** Rendered inline rather than in a sheet, for a checkout page. */
  inline?: boolean;
  visible?: boolean;
  onDismiss?: () => void;
  title?: string;
}

/**
 * The itemised price, expandable inline or as a sheet.
 *
 * Every fee line is reachable, not squeezed into tiny disclosure text, and the
 * status label ("Estimated" vs "Final") is never dropped — a total presented
 * without that word invites a dispute the moment it moves.
 */
export const PriceBreakdownSheet = ({
  breakdown,
  locale = 'en-IN',
  inline = false,
  visible = true,
  onDismiss,
  title = 'Price details',
  style,
  containerStyle,
  testID,
}: PriceBreakdownSheetProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const id = testID ?? 'price-breakdown';
  const [expandedId, setExpandedId] = useState<string>();

  const estimated = breakdown.status === 'estimated' || breakdown.status === 'calculating';
  const changed = breakdown.status === 'changed';

  const body = (
    <View style={{ gap: 2 }}>
      {changed && breakdown.changedNote ? (
        <View
          style={[
            styles.notice,
            { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginBottom: theme.spacing.sm },
          ]}
          accessibilityLiveRegion="assertive"
        >
          <Icon source="alert-circle-outline" size={15} color={theme.colors.onErrorContainer} />
          <Text variant="labelMedium" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
            {breakdown.changedNote}
          </Text>
        </View>
      ) : null}

      {breakdown.lines.map((line) => (
        <View key={line.id}>
          <MoneyRow
            label={line.label}
            value={line.amount}
            emphasis={LINE_EMPHASIS[line.type]}
            locale={locale}
            onExplain={line.expandable ? () => setExpandedId((prev) => (prev === line.id ? undefined : line.id)) : undefined}
            explainLabel={`What is ${line.label}?`}
            testID={childTestID(id, `line-${line.id}`)}
          />
          {expandedId === line.id && line.explanation ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.xs, paddingLeft: theme.spacing.xs }}
            >
              {line.explanation}
            </Text>
          ) : null}
        </View>
      ))}

      <Divider style={{ marginVertical: theme.spacing.sm }} />

      <MoneyRow
        label={estimated ? 'Estimated total' : 'Total'}
        value={breakdown.total}
        emphasis="total"
        locale={locale}
        testID={childTestID(id, 'total')}
      />

      {estimated ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          This is an estimate and may change based on the final duration and any add-ons.
        </Text>
      ) : null}

      {breakdown.cancellationFeeNote ? (
        <View
          style={[
            styles.notice,
            { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginTop: theme.spacing.sm },
          ]}
        >
          <Icon source="information-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
            {breakdown.cancellationFeeNote}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (inline) {
    return (
      <View style={containerStyle} testID={id}>
        {body}
      </View>
    );
  }

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss ?? (() => {})}
      variant="bottom"
      title={title}
      scrollable
      containerStyle={containerStyle}
      style={style}
      testID={id}
    >
      {body}
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start' },
});
