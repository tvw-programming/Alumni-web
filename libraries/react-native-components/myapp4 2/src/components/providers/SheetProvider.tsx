import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { AppSheet, type AppSheetProps } from '../organisms/AppSheet';

export type SheetOptions = Omit<AppSheetProps, 'visible' | 'onDismiss' | 'children'>;

interface SheetController {
  /** `sheet.open(<Filters />, { title: 'Filters' })` — no boolean state anywhere. */
  open: (content: React.ReactNode, options?: SheetOptions) => void;
  close: () => void;
  visible: boolean;
}

const SheetContext = createContext<SheetController | null>(null);

export const useSheet = (): SheetController => {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet must be used inside <SheetProvider>');
  return ctx;
};

interface SheetState {
  content: React.ReactNode;
  options: SheetOptions;
}

export const SheetProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<SheetState | null>(null);
  const [visible, setVisible] = useState(false);

  const open = useCallback((content: React.ReactNode, options: SheetOptions = {}) => {
    setState({ content, options });
    setVisible(true);
  }, []);

  // Keep the content mounted through the exit animation, then drop it.
  const close = useCallback(() => setVisible(false), []);

  const controller = useMemo<SheetController>(() => ({ open, close, visible }), [close, open, visible]);

  return (
    <SheetContext.Provider value={controller}>
      {children}
      {state && (
        <AppSheet
          {...state.options}
          visible={visible}
          onDismiss={close}
          testID={state.options.testID ?? 'app-sheet'}
        >
          {state.content}
        </AppSheet>
      )}
    </SheetContext.Provider>
  );
};
