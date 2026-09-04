import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import {
  useFormContext,
  useWatch,
  Controller,
  type ControllerRenderProps,
  type FieldValues,
  type RegisterOptions,
} from 'react-hook-form';
import Animated from 'react-native-reanimated';

import { useDebouncedValue, useMotion } from '@/hooks';

import { useFormRegistry, type FieldHandle } from './FormWrapper';

/**
 * Anything that can be a form control. The only contract is "renders something
 * and reports changes" — deliberately loose, because `as` must accept
 * `AppTextInput`, `RatingStars`, `OTPInput`, `FilterChipGroup`, … alike.
 */
type FieldComponent = React.ComponentType<Record<string, unknown>>;

export interface DependsOn {
  field: string;
  /** Render this field only when the watched field equals this value. */
  equals?: unknown;
  /** …or when this predicate passes. */
  when?: (value: unknown) => boolean;
}

export interface FormFieldProps {
  name: string;
  /** The control to render. Field-type agnostic by design. */
  as: FieldComponent;
  rules?: RegisterOptions;
  /** Conditional visibility driven by another field's value. */
  dependsOn?: DependsOn;
  /** Delay validation while the user is still typing. */
  debounceValidation?: number;
  /** Overrides the form-level setting. */
  showErrorOn?: 'blur' | 'change' | 'submit';
  /** Everything else is forwarded to the control. */
  [key: string]: unknown;
}

/** RN's `onChange` fires with a synthetic event; ours fire with a value. */
const isSyntheticEvent = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'nativeEvent' in (value as object);

export function FormField({
  name,
  as: Component,
  rules,
  dependsOn,
  debounceValidation = 0,
  showErrorOn,
  ...rest
}: FormFieldProps) {
  const { control, trigger, formState } = useFormContext<FieldValues>();
  const registry = useFormRegistry();
  const motion = useMotion();
  const handleRef = useRef<FieldHandle | null>(null);

  const dependencyValue = useWatch({ control, name: dependsOn?.field ?? name });
  const visible = useMemo(() => {
    if (!dependsOn) return true;
    if (dependsOn.when) return dependsOn.when(dependencyValue);
    return dependencyValue === dependsOn.equals;
  }, [dependencyValue, dependsOn]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => registry?.registerPosition(name, event.nativeEvent.layout.y),
    [name, registry],
  );

  useEffect(() => {
    registry?.registerHandle(name, handleRef.current);
    return () => registry?.registerHandle(name, null);
  }, [name, registry]);

  if (!visible) return null;

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldBody
          field={field}
          name={name}
          Component={Component}
          rest={rest}
          onLayout={onLayout}
          handleRef={handleRef}
          debounceValidation={debounceValidation}
          trigger={trigger}
          layout={motion.layout}
          hasError={!!fieldState.error}
          errorMessage={fieldState.error?.message}
          isTouched={fieldState.isTouched}
          isSubmitted={formState.isSubmitted}
          showErrorOn={showErrorOn ?? registry?.showErrorOn ?? 'blur'}
        />
      )}
    />
  );
}

interface FieldBodyProps {
  field: ControllerRenderProps<FieldValues, string>;
  name: string;
  Component: FieldComponent;
  rest: Record<string, unknown>;
  onLayout: (event: LayoutChangeEvent) => void;
  handleRef: React.MutableRefObject<FieldHandle | null>;
  debounceValidation: number;
  trigger: (name: string) => Promise<boolean>;
  layout: ReturnType<typeof useMotion>['layout'];
  hasError: boolean;
  errorMessage?: string;
  isTouched: boolean;
  isSubmitted: boolean;
  showErrorOn: 'blur' | 'change' | 'submit';
}

const FieldBody = ({
  field,
  name,
  Component,
  rest,
  onLayout,
  handleRef,
  debounceValidation,
  trigger,
  layout,
  hasError,
  errorMessage,
  isTouched,
  isSubmitted,
  showErrorOn,
}: FieldBodyProps) => {
  const debounced = useDebouncedValue(field.value, debounceValidation);

  useEffect(() => {
    if (debounceValidation > 0) void trigger(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const handleChange = useCallback(
    (next: unknown) => {
      // Ignore the raw RN TextInput event; the `onChangeText` call carries the value.
      if (isSyntheticEvent(next)) return;
      field.onChange(next);
    },
    [field],
  );

  const visibleError =
    hasError &&
    (showErrorOn === 'change' ||
      (showErrorOn === 'blur' && (isTouched || isSubmitted)) ||
      (showErrorOn === 'submit' && isSubmitted));

  return (
    // Layout.springify() so conditional fields reflow smoothly instead of
    // snapping the rest of the form up and down.
    <Animated.View onLayout={onLayout} layout={layout}>
      <Component
        {...rest}
        ref={handleRef}
        value={field.value}
        onChange={handleChange}
        onChangeText={handleChange}
        onBlur={field.onBlur}
        error={visibleError}
        errorText={visibleError ? errorMessage : undefined}
        testID={(rest.testID as string) ?? `field-${name}`}
      />
    </Animated.View>
  );
};
