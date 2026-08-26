import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { FormProvider, useForm, type FieldValues, type SubmitHandler, type UseFormProps, type UseFormReturn } from 'react-hook-form';

import type { StyleEscapeHatches } from '../primitives';

export interface FieldHandle {
  focus?: () => void;
  shake?: () => void;
}

interface FormRegistry {
  registerPosition: (name: string, y: number) => void;
  registerHandle: (name: string, handle: FieldHandle | null) => void;
  /** Scroll the first invalid field into view and shake it. */
  revealField: (name: string) => void;
  showErrorOn: 'blur' | 'change' | 'submit';
}

const FormRegistryContext = createContext<FormRegistry | null>(null);

export const useFormRegistry = (): FormRegistry | null => useContext(FormRegistryContext);

export interface FormWrapperProps<T extends FieldValues> extends StyleEscapeHatches {
  /** Pass an existing form, or let the wrapper create one from `defaultValues`. */
  form?: UseFormReturn<T>;
  formOptions?: UseFormProps<T>;
  onSubmit: SubmitHandler<T>;
  children: React.ReactNode;
  /** A render function receives the wired-up `submit` handler. */
  footer?: React.ReactNode | ((submit: () => void) => React.ReactNode);
  /** When validation errors should become visible. */
  showErrorOn?: 'blur' | 'change' | 'submit';
  scrollable?: boolean;
}

/**
 * Provides RHF context, keyboard avoidance, and scroll-to-first-error.
 *
 * Consumers never touch `control` — that is the point. They render
 * `<FormField name="…" as={…} />` and this wrapper does the plumbing.
 */
export function FormWrapper<T extends FieldValues>({
  form,
  formOptions,
  onSubmit,
  children,
  footer,
  showErrorOn = 'blur',
  scrollable = true,
  style,
  containerStyle,
  testID,
}: FormWrapperProps<T>) {
  const internalForm = useForm<T>({ mode: 'onBlur', ...formOptions });
  const methods = form ?? internalForm;

  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const handles = useRef<Record<string, FieldHandle | null>>({});

  const registerPosition = useCallback((name: string, y: number) => {
    positions.current[name] = y;
  }, []);

  const registerHandle = useCallback((name: string, handle: FieldHandle | null) => {
    handles.current[name] = handle;
  }, []);

  const revealField = useCallback((name: string) => {
    const y = positions.current[name];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
    const handle = handles.current[name];
    handle?.shake?.();
    handle?.focus?.();
  }, []);

  const registry = useMemo<FormRegistry>(
    () => ({ registerPosition, registerHandle, revealField, showErrorOn }),
    [registerHandle, registerPosition, revealField, showErrorOn],
  );

  const handleInvalid = useCallback(() => {
    // `Object.keys` follows registration order, which matches visual order.
    const firstInvalid = Object.keys(methods.formState.errors)[0];
    if (firstInvalid) revealField(firstInvalid);
  }, [methods.formState.errors, revealField]);

  const submit = useMemo(
    () => methods.handleSubmit(onSubmit, handleInvalid),
    [handleInvalid, methods, onSubmit],
  );

  const body = (
    <View style={[styles.body, style]} testID={testID}>
      {children}
    </View>
  );

  return (
    <FormRegistryContext.Provider value={registry}>
      <FormProvider {...methods}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          {scrollable ? (
            <ScrollView
              ref={scrollRef}
              style={[styles.flex, containerStyle]}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {body}
            </ScrollView>
          ) : (
            <View style={[styles.flex, containerStyle]}>{body}</View>
          )}

          {footer ? (
            <View style={styles.footer}>
              {typeof footer === 'function' ? footer(submit) : footer}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </FormProvider>
    </FormRegistryContext.Provider>
  );
}

/** Escape hatch for footers rendered outside the wrapper's own subtree. */
export const useFormSubmit = <T extends FieldValues>(
  methods: UseFormReturn<T>,
  onSubmit: SubmitHandler<T>,
) => useMemo(() => methods.handleSubmit(onSubmit), [methods, onSubmit]);

export const measureFieldPosition =
  (register: (y: number) => void) =>
  (event: LayoutChangeEvent): void =>
    register(event.nativeEvent.layout.y);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: 4 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  footer: { padding: 16, paddingTop: 8 },
});
