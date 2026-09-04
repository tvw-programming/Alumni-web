import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useForm, type FieldValues } from 'react-hook-form';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { RatingStars } from '@ui/atoms/RatingStars';
import { CurrencyInput } from '@ui/molecules/CurrencyInput';
import { FilterChipGroup } from '@ui/molecules/FilterChipGroup';
import { OTPInput } from '@ui/molecules/OTPInput';
import { PhoneInput } from '@ui/molecules/PhoneInput';
import { SegmentedTabs } from '@ui/molecules/SegmentedTabs';
import { FormField } from '@ui/organisms/FormField';
import { FormWrapper } from '@ui/organisms/FormWrapper';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import { buildRules } from './rules';
import { parseFormSchema, type FieldType, type FormFieldSchema, type FormSchema } from './types';

/**
 * The one schema-driven component worth building first.
 *
 * A KYC form, a health questionnaire, a property listing and a passenger form
 * are the same code path once you accept that forms are declarative by nature.
 */

type Control = React.ComponentType<Record<string, unknown>>;

/**
 * The registry is intentionally untyped at the boundary: `FormField` is
 * field-type agnostic, so the props it forwards are only known at runtime.
 * Everything above this line stays strictly typed.
 */
const asControl = (component: unknown): Control => component as Control;

const CONTROLS: Record<FieldType, Control> = {
  text: asControl(AppTextInput),
  email: asControl(AppTextInput),
  password: asControl(AppTextInput),
  phone: asControl(PhoneInput),
  currency: asControl(CurrencyInput),
  otp: asControl(OTPInput),
  rating: asControl(RatingStars),
  chips: asControl(FilterChipGroup),
  segmented: asControl(SegmentedTabs),
};

/** Per-type props the schema does not need to (and should not) specify. */
const typeProps = (field: FormFieldSchema): Record<string, unknown> => {
  switch (field.type) {
    case 'email':
      return { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email' };
    case 'password':
      return { secureToggle: true, autoCapitalize: 'none', autoComplete: 'password' };
    case 'chips':
      return { items: field.options ?? [], mode: 'multi' };
    case 'segmented':
      return { items: field.options ?? [] };
    default:
      return {};
  }
};

const defaultFor = (field: FormFieldSchema): unknown => {
  if (field.defaultValue !== undefined) return field.defaultValue;
  switch (field.type) {
    case 'currency':
    case 'rating':
      return 0;
    case 'chips':
      return [];
    case 'segmented':
      return field.options?.[0]?.key ?? '';
    default:
      return '';
  }
};

export interface FormRendererProps {
  /** Raw JSON from the server, or an imported fallback bundled in the app. */
  schema: unknown;
  onSubmit: (values: FieldValues) => void | Promise<void>;
  submitting?: boolean;
  testID?: string;
}

export const FormRenderer = ({ schema, onSubmit, submitting = false, testID }: FormRendererProps) => {
  const theme = useAppTheme();
  const parsed = useMemo(() => parseFormSchema(schema), [schema]);

  const defaultValues = useMemo(() => {
    if (!parsed.data) return {};
    return parsed.data.fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.name] = defaultFor(field);
      return acc;
    }, {});
  }, [parsed.data]);

  const form = useForm<FieldValues>({ defaultValues, mode: 'onBlur' });

  // Validation failed → show a state, never a half-rendered form.
  if (!parsed.ok || !parsed.data) {
    return (
      <StateView
        preset="error"
        title="This form is unavailable"
        description={__DEV__ ? parsed.error : 'Please update the app and try again.'}
        testID={testID ? `${testID}-invalid` : undefined}
      />
    );
  }

  const definition: FormSchema = parsed.data;

  return (
    <FormWrapper
      form={form}
      onSubmit={onSubmit}
      showErrorOn="blur"
      testID={testID}
      footer={(submit) => (
        <AppButton
          variant="primary"
          fullWidth
          loading={submitting}
          debounceMs={800}
          onPress={submit}
          testID={testID ? `${testID}-submit` : 'form-submit'}
        >
          {definition.submitLabel ?? 'Submit'}
        </AppButton>
      )}
    >
      {definition.title ? (
        <Text variant="titleLarge" style={{ marginBottom: theme.spacing.md }}>
          {definition.title}
        </Text>
      ) : null}

      {definition.fields.map((field) => {
        const Component = CONTROLS[field.type];
        if (!Component) {
          // Graceful degradation: an unknown field type must not blank the form.
          return __DEV__ ? (
            <Text key={field.name} style={{ color: theme.colors.error }}>
              Unknown field type: {field.type}
            </Text>
          ) : null;
        }
        return (
          <View key={field.name} style={{ marginBottom: theme.spacing.sm }}>
            <FormField
              name={field.name}
              as={Component}
              rules={buildRules(field.rules)}
              dependsOn={field.dependsOn}
              label={field.label}
              placeholder={field.placeholder}
              helperText={field.helperText}
              {...typeProps(field)}
              {...(field.props ?? {})}
            />
          </View>
        );
      })}
    </FormWrapper>
  );
};
