import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, List, ProgressBar, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { StatusBadge } from '@ui/atoms/StatusBadge';
import { StepperIndicator } from '@ui/molecules/StepperIndicator';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import type { VerificationDocument, VerificationDocumentStatus } from '../types/domain';

/** Capture problems, as codes — so the copy can be localized and specific. */
export type CaptureIssue = 'blurry' | 'glare' | 'cropped' | 'dark' | 'expired' | 'mismatch' | 'unreadable';

const ISSUE_COPY: Record<CaptureIssue, string> = {
  blurry: 'The photo is blurry. Hold steady and try again.',
  glare: 'There is glare on the document. Tilt it away from the light.',
  cropped: 'Move the document into the frame — all four corners must be visible.',
  dark: 'It is too dark. Move somewhere brighter.',
  expired: 'This document has expired. Use a valid one.',
  mismatch: 'The name does not match your account details.',
  unreadable: 'The expiry date is not readable. Try again.',
};

const STATUS_LABEL: Record<VerificationDocumentStatus, string> = {
  notStarted: 'Not started',
  capturing: 'In progress',
  uploaded: 'Uploaded',
  processing: 'Checking',
  manualReview: 'In review',
  approved: 'Approved',
  rejected: 'Action needed',
};

export interface CaptureResult {
  side: 'front' | 'back';
  /** Local URI. Never send this to analytics. */
  uri: string;
  issues?: CaptureIssue[];
}

export interface KYCUploaderProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  documents: VerificationDocument[];
  activeIndex?: number;
  /**
   * Injected so this component depends on no specific camera library.
   * Wire it to expo-camera, VisionCamera, or a document-scanner SDK.
   */
  onCapture: (document: VerificationDocument, side: 'front' | 'back') => Promise<CaptureResult>;
  /** Non-camera path — required for accessibility and for blocked permissions. */
  onPickFile?: (document: VerificationDocument, side: 'front' | 'back') => Promise<CaptureResult>;
  onUpload: (document: VerificationDocument, results: CaptureResult[]) => Promise<void>;
  onRetry?: (document: VerificationDocument) => void;
  onDocumentChange?: (index: number) => void;
  cameraPermission?: 'granted' | 'denied' | 'unavailable';
  onRequestCameraPermission?: () => void;
  /** 0–1. Represents real upload progress only — never a fake review bar. */
  uploadProgress?: number;
  privacyNote?: string;
}

/**
 * Guided, camera-first identity verification.
 *
 * Two rules encoded here rather than left to the caller: the progress bar only
 * ever represents the actual upload (server review is shown as an indefinite
 * "in review" state, not a 90%-full bar), and every failure produces an
 * actionable message rather than "Upload failed".
 */
export const KYCUploader = ({
  documents,
  activeIndex = 0,
  onCapture,
  onPickFile,
  onUpload,
  onRetry,
  onDocumentChange,
  cameraPermission = 'granted',
  onRequestCameraPermission,
  uploadProgress,
  privacyNote = 'Your documents are encrypted, used only for verification, and deleted according to our retention policy.',
  animated = true,
  style,
  containerStyle,
  testID,
}: KYCUploaderProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const motion = useMotion({ animated });

  const [captures, setCaptures] = useState<Record<string, CaptureResult[]>>({});
  const [issues, setIssues] = useState<CaptureIssue[]>([]);
  const [busySide, setBusySide] = useState<'front' | 'back' | null>(null);
  const [uploading, setUploading] = useState(false);

  const active = documents[activeIndex];
  const captured = active ? (captures[active.type] ?? []) : [];
  const complete = !!active && active.sides.every((side) => captured.some((c) => c.side === side));

  const steps = useMemo(
    () => documents.map((doc) => ({ key: doc.type, label: doc.label })),
    [documents],
  );

  const runCapture = useCallback(
    async (side: 'front' | 'back', useFilePicker = false) => {
      if (!active) return;
      setBusySide(side);
      setIssues([]);
      try {
        const handler = useFilePicker && onPickFile ? onPickFile : onCapture;
        const result = await handler(active, side);
        if (result.issues?.length) {
          // Actionable feedback, not a generic failure.
          setIssues(result.issues);
          return;
        }
        setCaptures((prev) => ({
          ...prev,
          [active.type]: [...(prev[active.type] ?? []).filter((c) => c.side !== side), result],
        }));
      } finally {
        setBusySide(null);
      }
    },
    [active, onCapture, onPickFile],
  );

  const submit = useCallback(async () => {
    if (!active) return;
    setUploading(true);
    try {
      await onUpload(active, captured);
      if (activeIndex < documents.length - 1) onDocumentChange?.(activeIndex + 1);
    } finally {
      setUploading(false);
    }
  }, [active, activeIndex, captured, documents.length, onDocumentChange, onUpload]);

  if (!active) {
    return <StateView preset="success" title="Verification complete" description="We have everything we need." />;
  }

  // Terminal / server-owned states get their own screen, no capture affordance.
  if (active.status === 'manualReview' || active.status === 'processing' || active.status === 'approved') {
    return (
      <View style={[{ padding: theme.spacing.md }, containerStyle]} testID={testID}>
        <StateView
          preset={active.status === 'approved' ? 'success' : 'empty'}
          title={active.status === 'approved' ? 'Verified' : 'We are reviewing your documents'}
          description={
            active.status === 'approved'
              ? 'Your identity has been confirmed.'
              : // Honest about the timeframe, and about what still works meanwhile.
                'This usually takes 1–2 working days. You can keep using your account with reduced limits while we check.'
          }
          testID={childTestID(testID, 'review')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, containerStyle, style]} testID={testID}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        {documents.length > 1 ? (
          <StepperIndicator
            steps={steps}
            current={activeIndex}
            variant="numbered"
            animated={animated}
            testID={childTestID(testID, 'steps')}
          />
        ) : null}

        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.flex}>
            {active.label}
          </Text>
          <StatusBadge status={active.status} label={STATUS_LABEL[active.status]} size="sm" />
        </View>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Document {activeIndex + 1} of {documents.length}
        </Text>

        {active.status === 'rejected' && active.rejectionReason ? (
          <AppCard variant="filled" style={{ backgroundColor: theme.colors.errorContainer }}>
            <View style={styles.headerRow}>
              <Icon source="alert-circle-outline" size={20} color={theme.colors.onErrorContainer} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer, marginLeft: theme.spacing.sm, flex: 1 }}>
                {active.rejectionReason}
              </Text>
            </View>
          </AppCard>
        ) : null}

        {active.requirements?.length ? (
          <AppCard variant="outlined" title="Before you start">
            {active.requirements.map((requirement) => (
              <List.Item
                key={requirement}
                title={requirement}
                titleNumberOfLines={3}
                left={() => <List.Icon icon="check-circle-outline" />}
              />
            ))}
          </AppCard>
        ) : null}

        {cameraPermission === 'denied' ? (
          <StateView
            preset="error"
            compact
            title="Camera access is off"
            description="Allow camera access to photograph your document, or upload a file instead."
            primaryAction={
              onRequestCameraPermission ? { label: 'Allow camera', onPress: onRequestCameraPermission } : undefined
            }
            testID={childTestID(testID, 'permission')}
          />
        ) : null}

        {issues.length > 0 ? (
          <Animated.View layout={motion.layout}>
            {issues.map((issue) => (
              <Text key={issue} variant="bodySmall" style={{ color: fintech.colors.statusError }}>
                {ISSUE_COPY[issue]}
              </Text>
            ))}
          </Animated.View>
        ) : null}

        {active.sides.map((side) => {
          const done = captured.some((c) => c.side === side);
          return (
            <AppCard
              key={side}
              variant="outlined"
              title={side === 'front' ? 'Front of document' : 'Back of document'}
              subtitle={done ? 'Captured' : 'Not captured yet'}
              testID={childTestID(testID, `side-${side}`)}
            >
              <View style={[styles.sideActions, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
                <AppButton
                  variant={done ? 'secondary' : 'primary'}
                  size="sm"
                  icon="camera-outline"
                  loading={busySide === side}
                  disabled={cameraPermission === 'denied'}
                  onPress={() => void runCapture(side)}
                  testID={childTestID(testID, `capture-${side}`)}
                >
                  {done ? 'Retake' : 'Take photo'}
                </AppButton>

                {/* Always offer a non-camera path. */}
                {onPickFile ? (
                  <AppButton
                    variant="ghost"
                    size="sm"
                    icon="file-upload-outline"
                    onPress={() => void runCapture(side, true)}
                    testID={childTestID(testID, `upload-${side}`)}
                  >
                    Upload a file
                  </AppButton>
                ) : null}
              </View>
            </AppCard>
          );
        })}

        {uploading || uploadProgress != null ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="labelSmall">Uploading…</Text>
            <ProgressBar
              // Indeterminate while we genuinely do not know — never a fake 90%.
              indeterminate={uploadProgress == null}
              progress={uploadProgress ?? 0}
              testID={childTestID(testID, 'progress')}
            />
          </View>
        ) : null}

        <AppButton
          variant="primary"
          fullWidth
          size="lg"
          disabled={!complete}
          loading={uploading}
          onPress={() => void submit()}
          testID={childTestID(testID, 'submit')}
        >
          {activeIndex < documents.length - 1 ? 'Continue' : 'Submit for verification'}
        </AppButton>

        {active.status === 'rejected' && active.retryable && onRetry ? (
          <AppButton variant="ghost" fullWidth onPress={() => onRetry(active)}>
            Start this document again
          </AppButton>
        ) : null}

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {privacyNote}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  sideActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
