/**
 * USAGE — KYCUploader
 *
 * The camera is injected. This demo fakes a capture that fails validation on the
 * first attempt, so the actionable-error path is visible without a real device.
 */
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { VerificationDocument } from '../types/domain';
import { KYCUploader, type CaptureResult } from './KYCUploader';
import sample from './KYCUploader.sample.json';

const { documents, reviewState } = loadSample<{
  documents: VerificationDocument[];
  reviewState: VerificationDocument;
}>(sample);

export const KYCUploaderUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [progress, setProgress] = useState<number | undefined>();
  const attempt = useRef(0);

  /** Stands in for expo-camera / VisionCamera / a scanner SDK. */
  const capture = useCallback(async (_doc: VerificationDocument, side: 'front' | 'back'): Promise<CaptureResult> => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    attempt.current += 1;
    // First attempt fails quality checks so the guidance copy is reachable.
    if (attempt.current === 1) return { side, uri: 'file://fake', issues: ['glare', 'cropped'] };
    return { side, uri: 'file://fake' };
  }, []);

  const pickFile = useCallback(async (_doc: VerificationDocument, side: 'front' | 'back'): Promise<CaptureResult> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { side, uri: 'file://picked' };
  }, []);

  /** Progress reflects the real upload only — review is a separate state. */
  const upload = useCallback(async () => {
    for (let p = 0; p <= 1; p += 0.25) {
      setProgress(p);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    setProgress(undefined);
    toast.success('Document uploaded');
  }, [toast]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          The first capture attempt deliberately fails validation to show the actionable error copy.
        </Text>
        <AppButton variant="ghost" size="sm" onPress={() => setShowReview((prev) => !prev)}>
          {showReview ? 'Back to capture flow' : 'Preview the manual-review state'}
        </AppButton>
      </View>

      <KYCUploader
        documents={showReview ? [reviewState] : documents}
        activeIndex={showReview ? 0 : index}
        onDocumentChange={setIndex}
        onCapture={capture}
        onPickFile={pickFile}
        onUpload={upload}
        onRetry={() => {
          attempt.current = 0;
          toast.show('Restarting this document');
        }}
        uploadProgress={progress}
        cameraPermission="granted"
        testID="kyc-uploader"
      />
    </ScrollView>
  );
};
