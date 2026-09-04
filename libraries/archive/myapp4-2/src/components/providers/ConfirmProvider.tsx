import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dialog, Portal, Text } from 'react-native-paper';

import { AppButton } from '../atoms/AppButton';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the danger variant. */
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * `const ok = await confirm({ ... })`.
 *
 * The promise is the whole point: no `pendingDeleteId` state, no
 * `onConfirm` callback threaded through three components.
 */
export const useConfirm = (): Confirm => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
};

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Portal>
        <Dialog visible={!!options} onDismiss={() => settle(false)} testID="confirm-dialog">
          <Dialog.Title>{options?.title}</Dialog.Title>
          {options?.message ? (
            <Dialog.Content>
              <Text variant="bodyMedium">{options.message}</Text>
            </Dialog.Content>
          ) : null}
          <Dialog.Actions>
            <AppButton variant="ghost" onPress={() => settle(false)} testID="confirm-cancel">
              {options?.cancelLabel ?? 'Cancel'}
            </AppButton>
            <AppButton
              variant={options?.destructive ? 'danger' : 'primary'}
              onPress={() => settle(true)}
              testID="confirm-accept"
            >
              {options?.confirmLabel ?? 'Confirm'}
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ConfirmContext.Provider>
  );
};
