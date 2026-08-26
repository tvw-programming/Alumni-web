import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Icon, Menu, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { VariantGroup, VariantOption } from '../types/domain';

export type VariantSelection = Record<string, string>;

/** Returns which option ids are still reachable given the current selection. */
export type ConstraintResolver = (
  selection: VariantSelection,
  group: VariantGroup,
) => Record<string, boolean> | undefined;

export interface VariantSelectorProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  groups: VariantGroup[];
  value?: VariantSelection;
  defaultValue?: VariantSelection;
  onChange?: (selection: VariantSelection, changedGroupId: string) => void;
  /** Keeps combination validity outside the selector's local assumptions. */
  resolver?: ConstraintResolver;
  /** Group ids that failed validation on submit. */
  errors?: Record<string, string>;
  onHelpPress?: (group: VariantGroup) => void;
  onNotifyMe?: (group: VariantGroup, option: VariantOption) => void;
  /** Force a render strategy; otherwise chosen from the group type. */
  render?: 'chips' | 'swatches' | 'dropdown';
}

const STRATEGY_FOR: Record<VariantGroup['type'], 'chips' | 'swatches' | 'dropdown'> = {
  size: 'chips',
  color: 'swatches',
  pack: 'chips',
  material: 'chips',
  flavor: 'chips',
  seller: 'dropdown',
};

/**
 * Variant picking with availability shown up-front.
 *
 * The behaviour that matters: out-of-stock options are visible but disabled
 * (Nike's pattern — greying out beats hiding, because absence is information),
 * and a selection that becomes invalid is *flagged*, never silently swapped.
 * Silently changing someone's size is how you get a return.
 */
export const VariantSelector = forwardRef<View, VariantSelectorProps>(function VariantSelector(
  {
    groups,
    value,
    defaultValue = {},
    onChange,
    resolver,
    errors = {},
    onHelpPress,
    onNotifyMe,
    render,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion({ animated });

  const [selection, setSelection] = useControllableState<VariantSelection>({
    value,
    defaultValue,
    onChange: undefined,
  });

  const select = useCallback(
    (group: VariantGroup, option: VariantOption) => {
      if (option.availability === 'outOfStock') {
        onNotifyMe?.(group, option);
        return;
      }
      const next = { ...selection, [group.id]: option.id };
      setSelection(next);
      onChange?.(next, group.id);
    },
    [onChange, onNotifyMe, selection, setSelection],
  );

  return (
    <View ref={ref} style={[{ gap: theme.spacing.lg }, containerStyle, style]} testID={testID}>
      {groups.map((group) => {
        const strategy = render ?? STRATEGY_FOR[group.type];
        const selectedId = selection[group.id];
        const selectedOption = group.options.find((option) => option.id === selectedId);
        const reachable = resolver?.(selection, group);
        const error = errors[group.id];

        return (
          <View key={group.id} style={{ gap: theme.spacing.sm }}>
            <View style={styles.headerRow}>
              <Text variant="labelLarge" accessibilityRole="header" style={styles.flex}>
                {group.label}
                {group.required ? ' *' : ''}
                {/* The selected value is spelled out — a swatch alone is not a label. */}
                {selectedOption ? `: ${selectedOption.label}` : ''}
              </Text>
              {group.helpLabel && onHelpPress ? (
                <Text
                  variant="labelMedium"
                  onPress={() => onHelpPress(group)}
                  accessibilityRole="button"
                  style={{ color: theme.colors.primary }}
                  testID={childTestID(testID, `help-${group.id}`)}
                >
                  {group.helpLabel}
                </Text>
              ) : null}
            </View>

            {strategy === 'dropdown' ? (
              <DropdownGroup
                group={group}
                selectedOption={selectedOption}
                onSelect={(option) => select(group, option)}
                testID={childTestID(testID, group.id)}
              />
            ) : (
              <Animated.View style={[styles.options, { gap: theme.spacing.sm }]} layout={motion.layout}>
                {group.options.map((option) => {
                  const selected = option.id === selectedId;
                  const unreachable = reachable ? reachable[option.id] === false : false;
                  const soldOut = option.availability === 'outOfStock' || unreachable;

                  if (strategy === 'swatches') {
                    return (
                      <TouchableRipple
                        key={option.id}
                        onPress={() => select(group, option)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: soldOut }}
                        // Colour swatches always carry a text name.
                        accessibilityLabel={`${option.label}${soldOut ? ', unavailable' : ''}${
                          option.availability === 'lowStock' ? ', only a few left' : ''
                        }`}
                        accessibilityHint={option.disabledReason}
                        borderless
                        style={{ borderRadius: theme.radii.pill }}
                        testID={childTestID(testID, `${group.id}-${option.id}`)}
                      >
                        <View style={styles.swatchWrap}>
                          <View
                            style={[
                              styles.swatch,
                              {
                                width: shop.layout.swatchSize,
                                height: shop.layout.swatchSize,
                                borderRadius: theme.radii.pill,
                                backgroundColor: option.swatch?.color ?? theme.colors.surfaceVariant,
                                borderWidth: selected ? 3 : 1,
                                borderColor: selected ? shop.colors.swatchSelected : shop.colors.swatchBorder,
                                opacity: soldOut ? 0.35 : 1,
                              },
                            ]}
                          >
                            {/* Selection carries a checkmark as well as a ring. */}
                            {selected ? <Icon source="check" size={16} color="#FFFFFF" /> : null}
                            {soldOut ? <View style={styles.strike} /> : null}
                          </View>
                          <Text
                            variant="labelSmall"
                            numberOfLines={1}
                            style={{
                              color: soldOut ? shop.colors.outOfStock : theme.colors.onSurfaceVariant,
                              maxWidth: shop.layout.swatchSize + 16,
                              textAlign: 'center',
                            }}
                          >
                            {option.label}
                          </Text>
                        </View>
                      </TouchableRipple>
                    );
                  }

                  return (
                    <Chip
                      key={option.id}
                      selected={selected}
                      showSelectedCheck={selected}
                      onPress={() => select(group, option)}
                      // Disabled but visible: absence of a size is information.
                      style={soldOut ? { opacity: 0.5 } : undefined}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: soldOut }}
                      accessibilityLabel={`${option.label}${soldOut ? ', unavailable' : ''}${
                        option.availability === 'lowStock' ? ', only a few left' : ''
                      }${option.priceLabel ? `, ${option.priceLabel}` : ''}`}
                      accessibilityHint={option.disabledReason}
                      testID={childTestID(testID, `${group.id}-${option.id}`)}
                    >
                      {option.label}
                      {option.priceLabel ? ` · ${option.priceLabel}` : ''}
                    </Chip>
                  );
                })}
              </Animated.View>
            )}

            {selectedOption?.availability === 'lowStock' ? (
              <Text variant="labelSmall" style={{ color: shop.colors.lowStock }}>
                Only a few left in {selectedOption.label}
              </Text>
            ) : null}

            {error ? (
              <HelperText type="error" visible padding="none" testID={childTestID(testID, `error-${group.id}`)}>
                {error}
              </HelperText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
});

const DropdownGroup = ({
  group,
  selectedOption,
  onSelect,
  testID,
}: {
  group: VariantGroup;
  selectedOption?: VariantOption;
  onSelect: (option: VariantOption) => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  const [open, setOpen] = React.useState(false);

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <TouchableRipple
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${group.label}: ${selectedOption?.label ?? 'not selected'}. Opens a list of options.`}
          style={[
            styles.dropdown,
            { borderColor: theme.colors.outline, borderRadius: theme.radii.md, padding: theme.spacing.md },
          ]}
          testID={childTestID(testID, 'anchor')}
        >
          <View style={styles.headerRow}>
            <Text variant="bodyMedium" style={styles.flex}>
              {selectedOption?.label ?? `Select ${group.label.toLowerCase()}`}
            </Text>
            <Icon source="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>
      }
    >
      {group.options.map((option) => (
        <Menu.Item
          key={option.id}
          onPress={() => {
            onSelect(option);
            setOpen(false);
          }}
          disabled={option.availability === 'outOfStock'}
          title={`${option.label}${option.priceLabel ? ` · ${option.priceLabel}` : ''}${
            option.availability === 'outOfStock' ? ' — unavailable' : ''
          }`}
          testID={childTestID(testID, `option-${option.id}`)}
        />
      ))}
    </Menu>
  );
};

/** Which required groups are still unselected — drives `chooseOptions`. */
export const missingRequiredGroups = (groups: VariantGroup[], selection: VariantSelection): VariantGroup[] =>
  groups.filter((group) => group.required && !selection[group.id]);

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  swatchWrap: { alignItems: 'center', gap: 4 },
  swatch: { alignItems: 'center', justifyContent: 'center' },
  strike: { position: 'absolute', width: '120%', height: 1.5, backgroundColor: '#8A9099', transform: [{ rotate: '-45deg' }] },
  dropdown: { borderWidth: 1 },
  flex: { flex: 1 },
});
