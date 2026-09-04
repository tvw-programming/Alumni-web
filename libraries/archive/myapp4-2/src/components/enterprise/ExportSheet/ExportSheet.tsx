import React, { useState } from 'react';
import { View } from 'react-native';
import { Checkbox, Icon, ProgressBar, RadioButton, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { ExportConfig, ExportFormat, ExportFormatId, ExportScopeOption, ExportStatus } from '../types/domain';

export interface ExportSheetProps extends StyleEscapeHatches {
  visible: boolean;
  formats: ExportFormat[];
  scopeOptions?: ExportScopeOption[];
  status?: ExportStatus;
  progress?: number;
  errorMessage?: string;
  downloadUrl?: string;
  onConfirm: (config: ExportConfig) => void;
  onDismiss: () => void;
  onOpenDownload?: (url: string) => void;
}

/**
 * Asks for format and scope before generating anything — never starts a
 * background export from an ambiguous default. Generation is asynchronous
 * and status-driven; the sheet never claims "Download ready" until the
 * caller reports a real signed URL.
 */
export const ExportSheet = ({ visible, formats, scopeOptions, status = 'idle', progress, errorMessage, downloadUrl, onConfirm, onDismiss, onOpenDownload, style, containerStyle, testID }: ExportSheetProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? 'export-sheet';
  const [formatId, setFormatId] = useState(formats.find((f) => f.available)?.id ?? formats[0]?.id);
  const [scopeId, setScopeId] = useState(scopeOptions?.[0]?.id);
  const [includeAttachments, setIncludeAttachments] = useState(false);

  const generating = status === 'generating' || status === 'queued';
  const canConfirm = !!formatId && formats.find((f) => f.id === formatId)?.available;

  const handleConfirm = () => {
    if (!canConfirm || !formatId) return;
    onConfirm({ formatId, scopeId, includeAttachments });
  };

  return (
    <AppSheet
      visible={visible}
      onDismiss={generating ? () => {} : onDismiss}
      variant="bottom"
      title="Export data"
      dismissible={!generating}
      scrollable={false}
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        status === 'complete' && downloadUrl ? (
          <AppButton variant="primary" size="lg" fullWidth onPress={() => onOpenDownload?.(downloadUrl)} testID={childTestID(id, 'download')}>
            Download ready
          </AppButton>
        ) : status === 'idle' || status === 'failed' ? (
          <AppButton variant="primary" size="lg" fullWidth disabled={!canConfirm} onPress={handleConfirm} testID={childTestID(id, 'generate')}>
            {status === 'failed' ? 'Try again' : 'Generate export'}
          </AppButton>
        ) : undefined
      }
    >
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        {status === 'idle' || status === 'failed' ? (
          <>
            <View>
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>
                Choose a format
              </Text>
              <RadioButton.Group value={formatId ?? ''} onValueChange={(v) => setFormatId(v as ExportFormatId)}>
                {formats.map((format) => (
                  <RadioButton.Item
                    key={format.id}
                    label={format.label}
                    value={format.id}
                    disabled={!format.available}
                    testID={childTestID(id, `format-${format.id}`)}
                  />
                ))}
              </RadioButton.Group>
              {formats.find((f) => f.id === formatId)?.description ? (
                <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: 12 }}>
                  {formats.find((f) => f.id === formatId)?.description}
                </Text>
              ) : null}
            </View>

            {scopeOptions && scopeOptions.length > 0 ? (
              <View>
                <Text variant="labelMedium" style={{ marginBottom: 4 }}>
                  Scope
                </Text>
                <RadioButton.Group value={scopeId ?? ''} onValueChange={setScopeId}>
                  {scopeOptions.map((scope) => (
                    <RadioButton.Item key={scope.id} label={scope.label} value={scope.id} testID={childTestID(id, `scope-${scope.id}`)} />
                  ))}
                </RadioButton.Group>
              </View>
            ) : null}

            <Checkbox.Item
              label="Include attachments"
              status={includeAttachments ? 'checked' : 'unchecked'}
              onPress={() => setIncludeAttachments((v) => !v)}
              testID={childTestID(id, 'include-attachments')}
            />

            {status === 'failed' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon source="alert-circle-outline" size={14} color={theme.colors.error} />
                <Text variant="labelSmall" style={{ color: theme.colors.error, marginLeft: 4 }}>
                  {errorMessage ?? 'Export failed.'}
                </Text>
              </View>
            ) : null}
          </>
        ) : generating ? (
          <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.lg }}>
            <Icon source="progress-download" size={32} color={theme.colors.primary} />
            <Text variant="titleSmall" accessibilityLiveRegion="polite">
              {status === 'queued' ? 'Your export is queued' : 'Your export is being prepared'}
            </Text>
            {progress != null ? <ProgressBar progress={progress} color={theme.colors.primary} style={{ width: '100%', height: 6, borderRadius: 3 }} /> : null}
          </View>
        ) : status === 'complete' ? (
          <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.lg }}>
            <Icon source="check-circle" size={32} color={enterprise.colors.success} />
            <Text variant="titleSmall">Your export is ready</Text>
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, textAlign: 'center' }}>
              The download link will expire after a limited time.
            </Text>
          </View>
        ) : null}
      </View>
    </AppSheet>
  );
};
