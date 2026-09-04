import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Icon, RadioButton, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppSheet } from '@ui/organisms/AppSheet';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { useSocialTheme } from '../theme/socialTokens';
import type {
  ModerationAction,
  ModerationOutcome,
  ReportReason,
  ReportTarget,
  UserSummary,
} from '../types/domain';

type Step = 'chooseAction' | 'chooseReason' | 'addDetail' | 'confirmBlock' | 'submitting' | 'done' | 'failed';

const ACTION_META: Record<
  ModerationAction,
  { label: string; description: string; icon: string; destructive?: boolean }
> = {
  report: {
    label: 'Report',
    description: "Tell us what's wrong. We'll review it against our policies.",
    icon: 'flag-outline',
  },
  block: {
    label: 'Block',
    description: "They won't be able to message you or see your posts, and you won't see theirs.",
    icon: 'block-helper',
    destructive: true,
  },
  mute: {
    label: 'Mute',
    description: "You won't see their posts. They won't know, and nothing else changes.",
    icon: 'volume-off',
  },
  restrict: {
    label: 'Restrict',
    description: "Their comments will only be visible to them until you approve each one.",
    icon: 'account-lock-outline',
  },
  hide: {
    label: 'Hide this',
    description: "Remove it from your feed. This doesn't report it or affect the account.",
    icon: 'eye-off-outline',
  },
};

export interface ReportBlockSheetProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  visible: boolean;
  onDismiss: () => void;
  targetKind: ReportTarget;
  targetId: string;
  /** The account involved — shown so the user knows who they are acting on. */
  targetUser?: UserSummary;
  /** Which actions this surface offers. Defaults to the full set. */
  actions?: ModerationAction[];
  reasons: ReportReason[];
  /** Set when the account is already blocked, so the sheet offers unblock. */
  alreadyBlocked?: boolean;
  policyUrl?: string;
  /** Locale-aware emergency number for the safety escalation path. */
  emergencyNumber?: string;
  onSubmit: (outcome: ModerationOutcome) => Promise<void>;
  onUnblock?: () => void;
}

/**
 * Report, block, mute and restrict, in one sheet.
 *
 * These four are kept visibly distinct because they mean very different things
 * and users routinely pick the wrong one — muting is invisible to the other
 * person, blocking is not, and restricting sits between them.
 *
 * The confirmation deliberately never promises an outcome or a timeline. It
 * says the report was received and will be reviewed against the policies, and
 * nothing about what will happen to the account — because we do not know, and
 * saying otherwise sets up a broken promise.
 */
export const ReportBlockSheet = ({
  visible,
  onDismiss,
  targetKind,
  targetId,
  targetUser,
  actions = ['report', 'block', 'mute', 'restrict'],
  reasons,
  alreadyBlocked = false,
  policyUrl,
  emergencyNumber = '112',
  onSubmit,
  onUnblock,
  animated = true,
  style,
  containerStyle,
  testID,
}: ReportBlockSheetProps) => {
  const theme = useAppTheme();
  const social = useSocialTheme();

  const id = testID ?? 'report-sheet';
  const [step, setStep] = useState<Step>('chooseAction');
  const [action, setAction] = useState<ModerationAction>('report');
  const [reasonId, setReasonId] = useState<string>();
  const [details, setDetails] = useState('');

  const reason = useMemo(() => reasons.find((item) => item.id === reasonId), [reasonId, reasons]);
  const escalation = reason?.escalation ?? 'none';

  const reset = useCallback(() => {
    setStep('chooseAction');
    setReasonId(undefined);
    setDetails('');
  }, []);

  const close = useCallback(() => {
    onDismiss();
    // Reset after the exit animation so the sheet doesn't visibly rewind.
    setTimeout(reset, 250);
  }, [onDismiss, reset]);

  const submit = useCallback(async () => {
    setStep('submitting');
    try {
      await onSubmit({
        action,
        reasonId,
        details: details.trim() || undefined,
        targetId,
        targetKind,
        submittedAt: new Date().toISOString(),
      });
      setStep('done');
    } catch {
      setStep('failed');
    }
  }, [action, details, onSubmit, reasonId, targetId, targetKind]);

  const targetLabel = targetKind === 'profile' ? 'this account' : `this ${targetKind}`;

  return (
    <AppSheet
      visible={visible}
      onDismiss={close}
      variant="bottom"
      title={
        step === 'done'
          ? undefined
          : step === 'chooseAction'
            ? `Options for ${targetLabel}`
            : step === 'confirmBlock'
              ? `Block ${targetUser?.displayName ?? 'this account'}?`
              : 'Report'
      }
      scrollable
      snapPoints={[0.7, 0.92]}
      animated={animated}
      containerStyle={containerStyle}
      style={style}
      testID={id}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Step 1 — the four actions, each with what it actually does. */}
        {step === 'chooseAction' ? (
          <View style={{ gap: theme.spacing.xs }}>
            {alreadyBlocked ? (
              <View
                style={[
                  styles.notice,
                  { backgroundColor: social.colors.surfaceFeedAlt, borderRadius: theme.radii.md, padding: theme.spacing.sm },
                ]}
              >
                <Icon source="information-outline" size={15} color={theme.colors.onSurfaceVariant} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
                  You already blocked {targetUser?.displayName ?? 'this account'}.
                </Text>
              </View>
            ) : null}

            {actions
              .filter((item) => !(item === 'block' && alreadyBlocked))
              .map((item) => {
                const meta = ACTION_META[item];
                return (
                  <TouchableRipple
                    key={item}
                    onPress={() => {
                      setAction(item);
                      if (item === 'report') setStep('chooseReason');
                      else if (item === 'block') setStep('confirmBlock');
                      else void submit();
                    }}
                    style={{ borderRadius: theme.radii.md }}
                    accessibilityRole="button"
                    accessibilityLabel={`${meta.label}. ${meta.description}`}
                    testID={childTestID(id, `action-${item}`)}
                  >
                    <View style={[styles.actionRow, { padding: theme.spacing.md, gap: theme.spacing.sm }]}>
                      <Icon
                        source={meta.icon}
                        size={20}
                        color={meta.destructive ? social.colors.statusError : theme.colors.onSurfaceVariant}
                      />
                      <View style={styles.flex}>
                        <Text
                          variant="titleSmall"
                          style={{ color: meta.destructive ? social.colors.statusError : theme.colors.onSurface }}
                        >
                          {meta.label}
                          {targetUser && item !== 'hide' ? ` ${targetUser.displayName}` : ''}
                        </Text>
                        {/* Each action explains itself — these are easy to confuse. */}
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {meta.description}
                        </Text>
                      </View>
                      <Icon source="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </TouchableRipple>
                );
              })}

            {alreadyBlocked && onUnblock ? (
              <AppButton
                variant="secondary"
                fullWidth
                onPress={onUnblock}
                containerStyle={{ marginTop: theme.spacing.sm }}
                testID={childTestID(id, 'unblock')}
              >
                Unblock {targetUser?.displayName ?? 'this account'}
              </AppButton>
            ) : null}
          </View>
        ) : null}

        {/* Step 2 — a single required reason, as a radio group. */}
        {step === 'chooseReason' ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="bodyMedium">Why are you reporting {targetLabel}?</Text>

            <RadioButton.Group value={reasonId ?? ''} onValueChange={setReasonId}>
              {reasons.map((item) => (
                <View key={item.id}>
                  <RadioButton.Item
                    label={item.label}
                    value={item.id}
                    position="leading"
                    accessibilityLabel={`${item.label}${item.description ? `. ${item.description}` : ''}`}
                    testID={childTestID(id, `reason-${item.id}`)}
                  />
                  {item.description ? (
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurfaceVariant, paddingLeft: 52, marginTop: -8, marginBottom: 6 }}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              ))}
            </RadioButton.Group>

            {/* Safety escalation appears the moment the reason implies it. */}
            {escalation !== 'none' ? (
              <View
                style={[
                  styles.escalation,
                  { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.md, padding: theme.spacing.md, gap: 6 },
                ]}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                testID={childTestID(id, 'escalation')}
              >
                <View style={styles.row}>
                  <Icon source="alert-circle" size={18} color={theme.colors.onErrorContainer} />
                  <Text variant="labelLarge" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
                    If someone is in immediate danger
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                  Contact local emergency services on {emergencyNumber}. Reporting here is important, but it is not an
                  emergency service and we cannot respond immediately.
                </Text>
                {escalation === 'selfHarm' ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                    We can also share support resources with this person.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={[styles.row, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
              <AppButton variant="ghost" onPress={() => setStep('chooseAction')} testID={childTestID(id, 'back')}>
                Back
              </AppButton>
              <AppButton
                variant="primary"
                containerStyle={styles.flex}
                disabled={!reasonId}
                onPress={() => (reason?.requiresDetails ? setStep('addDetail') : void submit())}
                testID={childTestID(id, 'next')}
              >
                {reason?.requiresDetails ? 'Add details' : 'Submit report'}
              </AppButton>
            </View>
          </View>
        ) : null}

        {/* Step 3 — optional or required free text. */}
        {step === 'addDetail' ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="bodyMedium">Tell us a bit more</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              This helps our reviewers understand the context. Don't include anything you wouldn't want a reviewer to
              read.
            </Text>

            <AppTextInput
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={5}
              maxLength={1000}
              showCounter
              label="What happened?"
              testID={childTestID(id, 'details')}
            />

            <View style={[styles.row, { gap: theme.spacing.sm }]}>
              <AppButton variant="ghost" onPress={() => setStep('chooseReason')}>
                Back
              </AppButton>
              <AppButton
                variant="primary"
                containerStyle={styles.flex}
                disabled={details.trim().length < 5}
                onPress={() => void submit()}
                testID={childTestID(id, 'submit-details')}
              >
                Submit report
              </AppButton>
            </View>
          </View>
        ) : null}

        {/* Block confirmation spells out exactly what changes. */}
        {step === 'confirmBlock' ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="bodyMedium">Blocking {targetUser?.displayName ?? 'this account'} means:</Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              {[
                "They can't message you",
                "They can't see your posts or profile",
                "You won't see their posts or comments",
                'Existing conversations stay in your archive',
                "They aren't told that you blocked them",
              ].map((line) => (
                <View key={line} style={[styles.row, { gap: 8 }]}>
                  <Icon source="circle-small" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.flex}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>

            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              You can unblock them at any time from their profile.
            </Text>

            <View style={[styles.row, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
              <AppButton variant="ghost" onPress={() => setStep('chooseAction')}>
                Cancel
              </AppButton>
              <AppButton
                variant="danger"
                containerStyle={styles.flex}
                onPress={() => void submit()}
                testID={childTestID(id, 'confirm-block')}
              >
                Block account
              </AppButton>
            </View>
          </View>
        ) : null}

        {step === 'submitting' ? (
          <View style={[styles.center, { padding: theme.spacing.xl, gap: theme.spacing.sm }]}>
            <Text variant="bodyMedium">Submitting…</Text>
          </View>
        ) : null}

        {/* Confirmation that promises nothing about the outcome. */}
        {step === 'done' ? (
          <StateView
            preset="success"
            title={
              action === 'report'
                ? 'Your report was submitted'
                : action === 'block'
                  ? `You blocked ${targetUser?.displayName ?? 'this account'}`
                  : action === 'mute'
                    ? `You muted ${targetUser?.displayName ?? 'this account'}`
                    : action === 'restrict'
                      ? `You restricted ${targetUser?.displayName ?? 'this account'}`
                      : 'Hidden from your feed'
            }
            description={
              action === 'report'
                ? "We'll review this content against our policies. We can't share the outcome of individual reviews."
                : ACTION_META[action].description
            }
            primaryAction={{ label: 'Done', onPress: close }}
            secondaryAction={
              policyUrl
                ? { label: 'Read our policies', onPress: () => void Linking.openURL(policyUrl) }
                : undefined
            }
            testID={childTestID(id, 'done')}
          />
        ) : null}

        {step === 'failed' ? (
          <StateView
            preset="error"
            title="We couldn't submit that"
            description="Check your connection and try again. Nothing has been sent yet."
            primaryAction={{ label: 'Try again', onPress: () => void submit() }}
            secondaryAction={{ label: 'Cancel', onPress: close }}
            testID={childTestID(id, 'failed')}
          />
        ) : null}

        {policyUrl && step === 'chooseAction' ? (
          <>
            <Divider style={{ marginVertical: theme.spacing.sm }} />
            <Text
              variant="labelSmall"
              onPress={() => void Linking.openURL(policyUrl)}
              accessibilityRole="link"
              style={{ color: theme.colors.primary }}
              testID={childTestID(id, 'policy')}
            >
              Read our community policies
            </Text>
          </>
        ) : null}
      </ScrollView>
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center' },
  escalation: {},
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
