import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, List, Text } from 'react-native-paper';

import { MoneyRow } from '@ui/molecules/MoneyRow';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { FareBreakdown, FareLineKind, PaymentTiming } from '../types/domain';

const KIND_EMPHASIS: Record<FareLineKind, 'default' | 'total' | 'savings' | 'muted' | 'estimated'> = {
  base: 'default',
  tax: 'muted',
  fee: 'default',
  discount: 'savings',
  addOn: 'default',
  deposit: 'default',
  credit: 'savings',
};

const PAYMENT_LABEL: Record<PaymentTiming, string> = {
  now: 'Pay now',
  later: 'Pay later',
  atProperty: 'Pay at property',
};

export interface FareBreakdownAccordionProps extends StyleEscapeHatches {
  breakdown: FareBreakdown;
  locale?: string;
  /** Starts expanded on a checkout page; collapsed inside a result card. */
  defaultExpanded?: boolean;
}

/**
 * A compact total that's always trustworthy on its own, plus an expandable
 * detail for every line. No fee is ever concealed until after payment — every
 * `FareLine` in `breakdown.lines` renders, mandatory or not, and a `changed`
 * status always explains itself next to the new total.
 */
export const FareBreakdownAccordion = ({ breakdown, locale = 'en-IN', defaultExpanded = false, style, containerStyle, testID }: FareBreakdownAccordionProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? 'fare-breakdown-accordion';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);

  const estimated = breakdown.status === 'estimated' || breakdown.status === 'calculating';

  return (
    <View style={[containerStyle, style]} testID={id}>
      <List.Accordion
        title="Price breakdown"
        description={
          breakdown.status === 'calculating'
            ? 'Calculating…'
            : estimated
              ? `Estimated total · ${formatMoney(breakdown.total, { locale })}`
              : `Includes taxes and fees · ${formatMoney(breakdown.total, { locale })}`
        }
        expanded={expanded}
        onPress={() => setExpanded((v) => !v)}
        left={(props) => <List.Icon {...props} icon="receipt-text-outline" />}
        testID={childTestID(id, 'toggle')}
      >
        <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: theme.spacing.xs }}>
          {breakdown.lines.map((line) => (
            <MoneyRow
              key={line.id}
              label={line.label + (line.optional ? ' (optional)' : '')}
              value={line.amount}
              emphasis={KIND_EMPHASIS[line.kind]}
              locale={locale}
              hint={expandedLineId === line.id ? line.explanation : undefined}
              onExplain={line.explanation ? () => setExpandedLineId((prev) => (prev === line.id ? null : line.id)) : undefined}
              explainLabel={`What is ${line.label}?`}
              testID={childTestID(id, `line-${line.id}`)}
            />
          ))}

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.outlineVariant, marginVertical: 4 }} />

          <MoneyRow label={estimated ? 'Estimated total' : 'Total'} value={breakdown.total} emphasis="total" locale={locale} testID={childTestID(id, 'total')} />

          {breakdown.paymentTiming ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {PAYMENT_LABEL[breakdown.paymentTiming]}
            </Text>
          ) : null}

          {breakdown.status === 'changed' && breakdown.changedNote ? (
            <View
              style={[styles.notice, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}
              accessibilityLiveRegion="assertive"
            >
              <Icon source="alert-circle-outline" size={14} color={theme.colors.onErrorContainer} />
              <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
                {breakdown.changedNote}
              </Text>
            </View>
          ) : null}

          {estimated ? (
            <Text variant="labelSmall" style={{ color: travel.colors.highDemand }}>
              Taxes calculated at checkout — amount shown is estimated.
            </Text>
          ) : null}
        </View>
      </List.Accordion>
    </View>
  );
};

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center' },
});
