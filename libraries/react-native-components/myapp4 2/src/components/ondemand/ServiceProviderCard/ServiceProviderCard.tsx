import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { RatingStars } from '@ui/atoms/RatingStars';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney } from '@ui/primitives/money';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { PriceUnit, ServiceProvider } from '../types/domain';

const UNIT_SUFFIX: Record<PriceUnit, string> = {
  flat: '',
  hour: '/hr',
  visit: '/visit',
  from: '',
};

export interface ServiceProviderCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  provider: ServiceProvider;
  locale?: string;
  loading?: boolean;
  variant?: 'list' | 'compact' | 'featured';
  onPress?: (provider: ServiceProvider) => void;
  onBook?: (provider: ServiceProvider) => void;
  onFavorite?: (provider: ServiceProvider, next: boolean) => void;
  onExplainVerification?: (provider: ServiceProvider) => void;
}

/**
 * A provider search result.
 *
 * The provider link, favourite toggle and book action are three separate
 * targets — never one card-wide tap. "Verified" always routes to an
 * explanation rather than standing alone, because a bare badge implies a scope
 * of background checking the platform may not actually perform.
 */
export const ServiceProviderCard = memo(function ServiceProviderCard({
  provider,
  locale = 'en-IN',
  loading = false,
  variant = 'list',
  onPress,
  onBook,
  onFavorite,
  onExplainVerification,
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: ServiceProviderCardProps) {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `provider-${provider.id}`;
  const compact = variant === 'compact';
  const unavailable = provider.availability === 'unavailable';

  const availabilityMeta = useMemo(() => {
    if (unavailable) return { label: 'Unavailable', icon: 'close-circle-outline', color: service.colors.unavailable };
    if (provider.availability === 'limited') {
      return { label: provider.nextAvailableLabel ?? 'Limited availability', icon: 'clock-alert-outline', color: service.colors.limitedAvailability };
    }
    return { label: provider.nextAvailableLabel ?? 'Available today', icon: 'check-circle-outline', color: service.colors.availableNow };
  }, [provider.availability, provider.nextAvailableLabel, service.colors, unavailable]);

  const accessibleName = useMemo(
    () =>
      [
        provider.name,
        provider.serviceLabel,
        provider.verified ? 'verified' : undefined,
        provider.rating ? `rated ${provider.rating.average} out of 5, ${provider.rating.count} reviews` : undefined,
        provider.distanceLabel,
        provider.price
          ? `${provider.priceUnit === 'from' ? 'starting from' : ''} ${formatMoney(provider.price, { locale })}${
              provider.priceUnit ? UNIT_SUFFIX[provider.priceUnit] : ''
            }`
          : 'price unavailable',
        availabilityMeta.label,
      ]
        .filter(Boolean)
        .join(', '),
    [availabilityMeta.label, locale, provider],
  );

  if (loading) {
    return (
      <View style={[{ padding: theme.spacing.md, gap: theme.spacing.sm }, containerStyle]} testID={childTestID(id, 'skeleton')}>
        <View style={styles.row}>
          <SkeletonLoader shape="circle" height={service.layout.providerAvatarSize} />
          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <SkeletonLoader shape="text" lines={2} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        {
          backgroundColor: service.colors.surfaceService,
          borderRadius: theme.radii.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.outlineVariant,
          opacity: unavailable ? 0.7 : 1,
          overflow: 'hidden',
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple
        onPress={onPress ? () => onPress(provider) : undefined}
        disabled={!onPress}
        accessibilityRole={onPress ? 'link' : 'none'}
        accessibilityLabel={accessibleName}
        accessibilityHint={onPress ? 'Opens the provider profile' : undefined}
        testID={childTestID(id, 'link')}
      >
        <View style={{ padding: theme.spacing.md, gap: 4 }}>
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            {provider.avatar?.uri ? (
              <Image
                source={{ uri: provider.avatar.uri }}
                style={{ width: service.layout.providerAvatarSize, height: service.layout.providerAvatarSize, borderRadius: theme.radii.pill }}
                accessibilityElementsHidden
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  {
                    width: service.layout.providerAvatarSize,
                    height: service.layout.providerAvatarSize,
                    borderRadius: theme.radii.pill,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {initialsOf(provider.name)}
                </Text>
              </View>
            )}

            <View style={styles.flex}>
              <View style={[styles.row, { gap: 4 }]}>
                <Text variant="titleSmall" numberOfLines={1} style={styles.shrink}>
                  {provider.name}
                </Text>
                {provider.verified ? (
                  <TouchableRipple
                    onPress={onExplainVerification ? () => onExplainVerification(provider) : undefined}
                    disabled={!onExplainVerification}
                    borderless
                    style={{ borderRadius: theme.radii.pill }}
                    accessibilityRole="button"
                    accessibilityLabel={`Verified. ${provider.verificationScope ?? 'Tap to see what this means'}`}
                    testID={childTestID(id, 'verified')}
                  >
                    <View style={[styles.row, { gap: 2 }]}>
                      <Icon source="check-decagram" size={14} color={service.colors.verified} />
                    </View>
                  </TouchableRipple>
                ) : null}
              </View>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {provider.serviceLabel}
              </Text>

              {provider.rating ? (
                <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
                  <RatingStars value={provider.rating.average} readonly allowHalf size="sm" entering={false} />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    ({provider.rating.count})
                  </Text>
                  {provider.distanceLabel ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      · {provider.distanceLabel}
                    </Text>
                  ) : null}
                </View>
              ) : provider.distanceLabel ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {provider.distanceLabel}
                </Text>
              ) : null}
            </View>

            {onFavorite ? (
              <IconButton
                icon={provider.favorited ? 'heart' : 'heart-outline'}
                size={20}
                onPress={() => onFavorite(provider, !provider.favorited)}
                accessibilityLabel={provider.favorited ? `Remove ${provider.name} from favourites` : `Save ${provider.name}`}
                accessibilityState={{ selected: provider.favorited }}
                style={{ margin: 0 }}
                testID={childTestID(id, 'favorite')}
              />
            ) : null}
          </View>

          <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.xs }]}>
            {provider.price ? (
              <Text variant="titleSmall" style={styles.tabular}>
                {provider.priceUnit === 'from' ? 'From ' : ''}
                {formatMoney(provider.price, { locale })}
                {provider.priceUnit ? UNIT_SUFFIX[provider.priceUnit] : ''}
              </Text>
            ) : (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Price available on request
              </Text>
            )}

            <View style={[styles.row, { gap: 3 }]}>
              <Icon source={availabilityMeta.icon} size={13} color={availabilityMeta.color} />
              <Text variant="labelSmall" style={{ color: availabilityMeta.color }}>
                {availabilityMeta.label}
              </Text>
            </View>
          </View>

          {provider.profileIncomplete ? (
            <Text variant="labelSmall" style={{ color: service.colors.limitedAvailability }}>
              This provider hasn't finished setting up their profile
            </Text>
          ) : null}
        </View>
      </TouchableRipple>

      {onBook ? (
        <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
          <AppButton
            variant={unavailable ? 'secondary' : 'primary'}
            size={compact ? 'sm' : 'md'}
            fullWidth
            disabled={unavailable}
            onPress={() => onBook(provider)}
            testID={childTestID(id, 'book')}
          >
            {unavailable ? 'Unavailable' : provider.requestOnly ? 'Request booking' : 'View profile'}
          </AppButton>
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  shrink: { flexShrink: 1 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
