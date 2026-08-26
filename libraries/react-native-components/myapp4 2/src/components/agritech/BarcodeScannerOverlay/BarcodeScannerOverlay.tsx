import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Portal, Snackbar, Text, TextInput } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { BarcodeResult } from '../types/domain';

export interface BarcodeScannerOverlayProps extends StyleEscapeHatches {
  visible: boolean;
  expectedCodes?: string[];
  scanMode?: 'single' | 'continuous';
  title?: string;
  statusMessage?: string;
  permissionDenied?: boolean;
  onDetected: (result: BarcodeResult) => void;
  onManualEntry?: (code: string) => void;
  onClose: () => void;
}

/**
 * A manual code-entry path always sits next to the camera, for damaged
 * labels, poor lighting, or accessibility — the overlay never decides
 * whether a scan is valid, it only passes the raw result up for the
 * caller's shipment/stop validation to judge.
 */
export const BarcodeScannerOverlay = ({ visible, expectedCodes, scanMode = 'single', title = 'Scan package barcode', statusMessage, permissionDenied = false, onDetected, onManualEntry, onClose, style, containerStyle, testID }: BarcodeScannerOverlayProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? 'barcode-scanner-overlay';
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedCount, setScannedCount] = useState(0);

  const simulateScan = () => {
    const code = expectedCodes?.[0] ?? `SCAN-${Date.now()}`;
    setScannedCount((c) => c + 1);
    onDetected({ code, format: 'CODE128', timestamp: new Date().toISOString() });
  };

  return (
    <Portal>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID={id}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.85)' }, containerStyle, style]}>
          <View style={styles.header}>
            <Text variant="titleMedium" style={{ color: '#FFFFFF', flex: 1 }}>
              {title}
            </Text>
            <IconButton icon="close" iconColor="#FFFFFF" size={22} onPress={onClose} accessibilityLabel="Close scanner" testID={childTestID(id, 'close')} />
          </View>

          {permissionDenied ? (
            <View style={styles.center}>
              <Text variant="bodyMedium" style={{ color: '#FFFFFF', textAlign: 'center' }}>
                Camera permission required to scan.
              </Text>
              <AppButton variant="primary" size="md" onPress={() => setManualMode(true)} style={{ marginTop: 12 }} testID={childTestID(id, 'permission-fallback')}>
                Enter code manually
              </AppButton>
            </View>
          ) : manualMode ? (
            <View style={styles.center}>
              <TextInput mode="outlined" label="Enter code manually" value={manualCode} onChangeText={setManualCode} style={styles.manualInput} testID={childTestID(id, 'manual-input')} />
              <AppButton
                variant="primary"
                size="md"
                disabled={!manualCode.trim()}
                onPress={() => {
                  onManualEntry?.(manualCode.trim());
                  onDetected({ code: manualCode.trim(), format: 'manual', timestamp: new Date().toISOString() });
                  setManualCode('');
                }}
                testID={childTestID(id, 'manual-submit')}
              >
                Submit code
              </AppButton>
              <Text variant="labelMedium" onPress={() => setManualMode(false)} accessibilityRole="button" style={{ color: '#FFFFFF', marginTop: 12 }}>
                Use camera instead
              </Text>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={[styles.frame, { width: agri.layout.scannerFrameSize, height: agri.layout.scannerFrameSize, borderColor: theme.colors.primary }]}>
                <ActivityIndicator size={24} color={theme.colors.primary} />
              </View>
              <Text variant="bodySmall" style={{ color: '#FFFFFF', marginTop: 12, textAlign: 'center' }}>
                Align the barcode within the frame
              </Text>
              {scanMode === 'continuous' && scannedCount > 0 ? (
                <Text variant="labelSmall" style={{ color: '#FFFFFF', marginTop: 4 }}>
                  {scannedCount} scanned
                </Text>
              ) : null}
              <AppButton variant="primary" size="md" onPress={simulateScan} style={{ marginTop: 16 }} testID={childTestID(id, 'simulate-scan')}>
                Simulate scan
              </AppButton>
              <Text variant="labelMedium" onPress={() => setManualMode(true)} accessibilityRole="button" style={{ color: '#FFFFFF', marginTop: 12 }}>
                Enter code manually
              </Text>
            </View>
          )}
        </View>
      </Modal>
      <Snackbar visible={!!statusMessage} onDismiss={() => {}} duration={2500}>
        {statusMessage}
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  frame: { borderWidth: 3, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  manualInput: { width: '100%', marginBottom: 12 },
});
