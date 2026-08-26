import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Menu, Text, TextInput as PaperTextInput } from 'react-native-paper';

import { useControllableState } from '@/hooks';
import { useAppTheme } from '@/theme';
import { COUNTRIES, childTestID, toE164, type Country } from '@/utils';

import { AppTextInput, type AppTextInputHandle, type AppTextInputProps } from '../atoms/AppTextInput';

export interface PhoneInputProps
  extends Omit<AppTextInputProps, 'value' | 'defaultValue' | 'onChangeText' | 'onChange' | 'mask' | 'left'> {
  /** National number (no dial code). */
  value?: string;
  defaultValue?: string;
  onChange?: (national: string) => void;
  /** Fires with the full E.164 string — what your API actually wants. */
  onChangeFormatted?: (e164: string, country: Country) => void;
  defaultCountry?: string;
  /** ISO codes floated to the top of the picker. */
  preferredCountries?: string[];
}

export const PhoneInput = forwardRef<AppTextInputHandle, PhoneInputProps>(function PhoneInput(
  {
    value,
    defaultValue = '',
    onChange,
    onChangeFormatted,
    defaultCountry = 'IN',
    preferredCountries = ['IN', 'US'],
    testID,
    label = 'Phone number',
    ...rest
  },
  ref,
) {
  const theme = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [country, setCountry] = useState<Country>(
    () => COUNTRIES.find((c) => c.code === defaultCountry) ?? (COUNTRIES[0] as Country),
  );
  const [national, setNational] = useControllableState<string>({ value, defaultValue, onChange });

  const ordered = useMemo(() => {
    const preferred = preferredCountries
      .map((code) => COUNTRIES.find((c) => c.code === code))
      .filter((c): c is Country => !!c);
    const rest2 = COUNTRIES.filter((c) => !preferredCountries.includes(c.code));
    return [...preferred, ...rest2];
  }, [preferredCountries]);

  const emit = useCallback(
    (next: string, nextCountry: Country) => {
      setNational(next);
      onChangeFormatted?.(toE164(nextCountry.dial, next), nextCountry);
    },
    [onChangeFormatted, setNational],
  );

  const handleSelect = useCallback(
    (next: Country) => {
      setCountry(next);
      setMenuOpen(false);
      emit(national, next);
    },
    [emit, national],
  );

  return (
    <View>
      <AppTextInput
        {...rest}
        ref={ref}
        label={label}
        mask="phone"
        value={national}
        onChangeText={(text) => emit(text, country)}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        testID={testID}
        left={
          <PaperTextInput.Affix
            text={`${country.flag} ${country.dial}`}
            onPress={() => setMenuOpen(true)}
            textStyle={{ color: theme.colors.onSurface }}
          />
        }
      />

      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={<View style={styles.anchor} />}
        testID={childTestID(testID, 'country-menu')}
      >
        {ordered.map((item, i) => (
          <React.Fragment key={item.code}>
            {i === preferredCountries.length && <Divider />}
            <Menu.Item
              onPress={() => handleSelect(item)}
              title={`${item.flag}  ${item.name}  ${item.dial}`}
              titleStyle={{ color: item.code === country.code ? theme.colors.primary : theme.colors.onSurface }}
              testID={childTestID(testID, `country-${item.code}`)}
            />
          </React.Fragment>
        ))}
      </Menu>

      {/* Hidden mirror of the value the backend receives — handy in E2E tests. */}
      <Text accessibilityElementsHidden style={styles.hidden} testID={childTestID(testID, 'e164')}>
        {toE164(country.dial, national)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  anchor: { height: 0, width: 0 },
  hidden: { height: 0, opacity: 0 },
});
