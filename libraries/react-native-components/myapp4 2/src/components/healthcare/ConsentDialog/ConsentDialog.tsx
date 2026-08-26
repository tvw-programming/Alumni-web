import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Divider, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { ConsentItem, ConsentRecord } from '../types/domain';
import { useConsentController } from './consentController';

export interface ConsentDialogProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  visible: boolean;
  title: string;
  /** One or two sentences on why this is being asked. */
  reason: string;
  items: ConsentItem[];
  subject: string;
  actor: string;
  existingRecords?: ConsentRecord[];
  /** Required consent blocks the flow; optional consent never does. */
  blocking?: boolean;
  acceptLabel?: string;
  declineLabel?: string;
  onAccept: (records: ConsentRecord[]) => void;
  onDecline: (records: ConsentRecord[]) => void;
  onDismiss: () => void;
  /** Shown when re-consenting after a policy change. */
  policyChangedNote?: string;
}

/**
 * Consent capture.
 *
 * Structured as progressive disclosure — plain-language summary, expandable
 * detail, then the full policy — because a wall of legal text in a small modal
 * is how you get uninformed consent that will not survive review.
 *
 * The buttons say what they do ("I agree and continue", not "Continue"), and
 * declining an optional consent never claims care is impossible.
 */
export const ConsentDialog = ({
  visible,
  title,
  reason,
  items,
  subject,
  actor,
  existingRecords,
  blocking = false,
  acceptLabel = 'I agree and continue',
  declineLabel = 'Not now',
  onAccept,
  onDecline,
  onDismiss,
  policyChangedNote,
  animated = true,
  style,
  containerStyle,
  testID,
}: ConsentDialogProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const controller = useConsentController({ items, subject, actor, existing: existingRecords });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title={title}
      // A required consent must not be swipe-dismissed by accident.
      dismissible={!blocking}
      enableBackdropPress={!blocking}
      scrollable
      snapPoints={[0.75, 0.95]}
      animated={animated}
      containerStyle={containerStyle}
      style={style}
      testID={testID}
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          {!controller.canSubmit ? (
            <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction }}>
              {controller.outstandingRequired.length} required item
              {controller.outstandingRequired.length === 1 ? '' : 's'} still needs your agreement.
            </Text>
          ) : null}

          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={!controller.canSubmit}
            onPress={() => onAccept(controller.accept())}
            testID={childTestID(testID, 'accept')}
          >
            {acceptLabel}
          </AppButton>

          <AppButton
            variant="ghost"
            fullWidth
            onPress={() => onDecline(controller.decline())}
            testID={childTestID(testID, 'decline')}
          >
            {declineLabel}
          </AppButton>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: theme.spacing.md }}>
          {policyChangedNote ? (
            <View
              style={[
                styles.notice,
                { backgroundColor: health.colors.surfaceCalm, borderRadius: theme.radii.md, padding: theme.spacing.sm },
              ]}
            >
              <Icon source="update" size={16} color={health.colors.onSurfaceCalm} />
              <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm, marginLeft: 6, flex: 1 }}>
                {policyChangedNote}
              </Text>
            </View>
          ) : null}

          <Text variant="bodyMedium">{reason}</Text>

          {items.map((item) => {
            const checked = !!controller.decisions[item.id];
            const isOpen = !!expanded[item.id];

            return (
              <View key={item.id} style={{ gap: theme.spacing.xs }}>
                <TouchableRipple
                  onPress={() => controller.setDecision(item.id, !checked)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${item.title}. ${item.summary}. ${item.required ? 'Required' : 'Optional'}`}
                  testID={childTestID(testID, `item-${item.id}`)}
                >
                  <View style={[styles.row, { gap: theme.spacing.xs }]}>
                    <Checkbox status={checked ? 'checked' : 'unchecked'} onPress={() => controller.setDecision(item.id, !checked)} />
                    <View style={styles.flex}>
                      <View style={[styles.row, { gap: theme.spacing.xs }]}>
                        <Text variant="titleSmall" style={styles.flex}>
                          {item.title}
                        </Text>
                        <Text
                          variant="labelSmall"
                          style={{ color: item.required ? health.colors.consentRequired : health.colors.consentOptional }}
                        >
                          {item.required ? 'Required' : 'Optional'}
                        </Text>
                      </View>

                      {/* Layer 1: plain-language summary. */}
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {item.summary}
                      </Text>

                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Applies to: {item.scope} · version {item.version}
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>

                <View style={[styles.row, { gap: theme.spacing.md, paddingLeft: 40 }]}>
                  {item.detail ? (
                    <Text
                      variant="labelSmall"
                      onPress={() => setExpanded((prev) => ({ ...prev, [item.id]: !isOpen }))}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      style={{ color: theme.colors.primary }}
                      testID={childTestID(testID, `detail-${item.id}`)}
                    >
                      {isOpen ? 'Show less' : 'What does this mean?'}
                    </Text>
                  ) : null}

                  {/* Layer 3: the full policy, opened deliberately. */}
                  {item.policyUrl ? (
                    <Text
                      variant="labelSmall"
                      onPress={() => void Linking.openURL(item.policyUrl as string)}
                      accessibilityRole="link"
                      accessibilityLabel={`Read the full policy for ${item.title}`}
                      style={{ color: theme.colors.primary }}
                      testID={childTestID(testID, `policy-${item.id}`)}
                    >
                      Read the full policy
                    </Text>
                  ) : null}
                </View>

                {/* Layer 2: expandable detail. */}
                {isOpen && item.detail ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant, paddingLeft: 40 }}
                  >
                    {item.detail}
                  </Text>
                ) : null}

                <Divider style={{ marginTop: theme.spacing.xs }} />
              </View>
            );
          })}

          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            You can withdraw optional consent later in Settings. Declining an optional item does not affect your care.
          </Text>
        </View>
      </ScrollView>
    </AppSheet>
  );
};
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  notice: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
