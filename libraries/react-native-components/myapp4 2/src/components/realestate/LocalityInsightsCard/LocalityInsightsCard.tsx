import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { InsightCategory, LocalityInsight, PriceTrendSummary } from '../types/domain';

const CATEGORY_META: Record<InsightCategory, { icon: string; section: string }> = {
  school: { icon: 'school-outline', section: 'Education' },
  hospital: { icon: 'hospital-box-outline', section: 'Healthcare' },
  transit: { icon: 'train-car', section: 'Getting around' },
  commute: { icon: 'clock-time-four-outline', section: 'Getting around' },
  price: { icon: 'chart-line', section: 'Price trends' },
  safety: { icon: 'shield-outline', section: 'Everyday essentials' },
};

export interface LocalityInsightsCardProps extends StyleEscapeHatches {
  localityName: string;
  insights: LocalityInsight[];
  priceTrend?: PriceTrendSummary;
  loading?: boolean;
  onViewLocality?: () => void;
}

/**
 * Every insight names its distance and, where available, its source — never
 * a bare icon claiming proximity. No subjective "best locality" language;
 * only labelled, sourced metrics.
 */
export const LocalityInsightsCard = ({ localityName, insights, priceTrend, loading = false, onViewLocality, style, containerStyle, testID }: LocalityInsightsCardProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'locality-insights-card';

  const grouped = useMemo(() => {
    const sections = new Map<string, LocalityInsight[]>();
    for (const insight of insights) {
      const section = CATEGORY_META[insight.category].section;
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section)!.push(insight);
    }
    return Array.from(sections.entries());
  }, [insights]);

  if (loading) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={childTestID(id, 'loading')}>
        <Text variant="bodyMedium" style={{ color: realestate.colors.onSurfaceVariant }}>
          Loading locality insights…
        </Text>
      </AppCard>
    );
  }

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {localityName}
          </Text>
          {onViewLocality ? (
            <TouchableRipple onPress={onViewLocality} accessibilityRole="button" accessibilityLabel={`View ${localityName} locality report`} testID={childTestID(id, 'view')}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                View locality
              </Text>
            </TouchableRipple>
          ) : null}
        </View>

        {priceTrend ? (
          <View style={styles.row}>
            <Icon
              source={priceTrend.direction === 'up' ? 'trending-up' : priceTrend.direction === 'down' ? 'trending-down' : 'trending-neutral'}
              size={14}
              color={priceTrend.direction === 'up' ? realestate.colors.priceUp : priceTrend.direction === 'down' ? realestate.colors.priceDown : realestate.colors.priceFlat}
            />
            <Text
              variant="labelMedium"
              style={{
                color: priceTrend.direction === 'up' ? realestate.colors.priceUp : priceTrend.direction === 'down' ? realestate.colors.priceDown : realestate.colors.priceFlat,
                marginLeft: 4,
              }}
            >
              {priceTrend.direction === 'flat' ? 'Prices are stable' : `${priceTrend.direction === 'up' ? 'Up' : 'Down'} ${Math.abs(priceTrend.changePercent).toFixed(1)}% ${priceTrend.periodLabel}`}
            </Text>
          </View>
        ) : null}

        {grouped.map(([section, items]) => (
          <View key={section} style={{ gap: 4 }}>
            <Text variant="labelMedium" style={{ color: realestate.colors.onSurfaceVariant }}>
              {section}
            </Text>
            {items.map((item) => (
              <View key={item.id} style={styles.insightRow}>
                <Icon source={CATEGORY_META[item.category].icon} size={14} color={realestate.colors.onSurfaceVariant} />
                <View style={[styles.flex, { marginLeft: 8 }]}>
                  <Text variant="bodySmall">
                    {item.label}
                    {item.distance ? ` · ${item.distance}` : ''}
                  </Text>
                  <Text variant="labelSmall">{item.value}</Text>
                  {item.source || item.freshness ? (
                    <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
                      {[item.source, item.freshness].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))}

        {insights.length === 0 ? (
          <Text variant="bodySmall" style={{ color: realestate.colors.onSurfaceVariant }}>
            Locality data unavailable for this property.
          </Text>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
});
