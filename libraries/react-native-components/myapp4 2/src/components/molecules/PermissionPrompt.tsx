import React, { forwardRef, useCallback, useState } from 'react';
import { Linking, View } from 'react-native';

import { childTestID } from '@/utils';

import { StateView } from './StateView';
import type { StyleEscapeHatches } from '../primitives';

export type PermissionStatus = 'granted' | 'denied' | 'blocked';

export interface PermissionPromptProps extends StyleEscapeHatches {
  /** Label used in the copy, e.g. "camera", "location". */
  permission: string;
  /** Why you need it. Shown before the OS dialog — this is the part that
   *  actually moves the grant rate. */
  rationale: string;
  /**
   * Injected so this component never depends on a specific permissions library.
   * Wire it to expo-camera, react-native-permissions, whatever you use.
   */
  request: () => Promise<PermissionStatus>;
  onGranted?: () => void;
  onDenied?: (status: PermissionStatus) => void;
  /** On 'blocked', send the user to the OS settings page instead of re-asking. */
  openSettingsOnBlocked?: boolean;
  title?: string;
}

export const PermissionPrompt = forwardRef<View, PermissionPromptProps>(function PermissionPrompt(
  {
    permission,
    rationale,
    request,
    onGranted,
    onDenied,
    openSettingsOnBlocked = true,
    title,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [pending, setPending] = useState(false);

  const handleRequest = useCallback(async () => {
    setPending(true);
    try {
      const next = await request();
      setStatus(next);
      if (next === 'granted') onGranted?.();
      else onDenied?.(next);
    } finally {
      setPending(false);
    }
  }, [onDenied, onGranted, request]);

  const blocked = status === 'blocked';

  return (
    <View ref={ref} style={containerStyle} testID={testID}>
      <StateView
        preset={blocked ? 'error' : 'empty'}
        title={title ?? `Allow access to your ${permission}`}
        description={
          blocked
            ? `${permission} access is turned off for this app. You can turn it back on in Settings.`
            : rationale
        }
        primaryAction={
          blocked && openSettingsOnBlocked
            ? { label: 'Open settings', onPress: () => void Linking.openSettings() }
            : { label: 'Continue', onPress: () => void handleRequest(), loading: pending }
        }
        style={style}
        testID={childTestID(testID, 'state')}
      />
    </View>
  );
});
