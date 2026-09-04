import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion } from '@/hooks';
import { resolveIntent, useAppTheme, type Intent } from '@/theme';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  intent?: Intent;
  durationMs?: number;
  position?: 'top' | 'bottom';
  action?: ToastAction;
}

interface Toast extends Required<Omit<ToastOptions, 'action'>> {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastController {
  show: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastController | null>(null);

export const useToast = (): ToastController => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

let nextId = 1;

/**
 * FIFO queue with exactly one toast visible. Stacking toasts is how you end up
 * covering half the screen during a burst of network errors.
 */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const [queue, setQueue] = useState<Toast[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = queue[0];

  const dismiss = useCallback(() => setQueue((prev) => prev.slice(1)), []);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    setQueue((prev) => [
      ...prev,
      {
        id: nextId++,
        message,
        intent: options.intent ?? 'neutral',
        durationMs: options.durationMs ?? 3200,
        position: options.position ?? 'bottom',
        action: options.action,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!current) return;
    timer.current = setTimeout(dismiss, current.durationMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [current, dismiss]);

  const controller = useMemo<ToastController>(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, intent: 'success' }),
      error: (message, options) => show(message, { durationMs: 5000, ...options, intent: 'error' }),
      warning: (message, options) => show(message, { ...options, intent: 'warning' }),
      dismiss,
    }),
    [dismiss, show],
  );

  const colors = current ? resolveIntent(theme, current.intent) : null;
  const atTop = current?.position === 'top';

  return (
    <ToastContext.Provider value={controller}>
      {children}
      {/* Portal so toasts render above sheets, dialogs and navigation. */}
      <Portal>
        <View
          pointerEvents="box-none"
          style={[
            styles.host,
            atTop
              ? { top: insets.top + theme.spacing.sm }
              : { bottom: insets.bottom + theme.spacing.sm },
          ]}
        >
          {current && colors && (
            <Animated.View
              key={current.id}
              entering={motion.enabled ? (atTop ? FadeInUp : FadeInDown).duration(motion.ms('base')) : undefined}
              exiting={motion.enabled ? FadeOut.duration(motion.ms('fast')) : undefined}
              layout={motion.enabled ? LinearTransition : undefined}
            >
              <Snackbar
                visible
                onDismiss={dismiss}
                duration={Number.MAX_SAFE_INTEGER}
                style={{ backgroundColor: colors.main, borderRadius: theme.radii.md }}
                theme={{ colors: { inverseOnSurface: colors.on, inversePrimary: colors.on } }}
                action={
                  current.action
                    ? {
                        label: current.action.label,
                        textColor: colors.on,
                        onPress: () => {
                          current.action?.onPress();
                          dismiss();
                        },
                      }
                    : undefined
                }
                testID="toast"
              >
                {current.message}
              </Snackbar>
            </Animated.View>
          )}
        </View>
      </Portal>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0 },
});
