import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { ContactRole, PropertyAgent } from '../types/domain';

const ROLE_LABEL: Record<ContactRole, string> = { agent: 'Agent', owner: 'Owner', builder: 'Builder representative', propertyManager: 'Property manager' };

export interface AgentContactCardProps extends StyleEscapeHatches {
  agent: PropertyAgent;
  compact?: boolean;
  onCall?: () => void;
  onWhatsApp?: () => void;
  onEnquire?: () => void;
}

/**
 * Call and WhatsApp are visually distinct actions, never a single ambiguous
 * "contact" button — and phone numbers stay masked by convention: this card
 * only ever asks the host screen to place the call or open WhatsApp, it
 * never renders a raw number itself.
 */
export const AgentContactCard = ({ agent, compact = false, onCall, onWhatsApp, onEnquire, style, containerStyle, testID }: AgentContactCardProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? `agent-${agent.id}`;

  const content = (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={styles.row}>
        {agent.avatar?.uri ? <Avatar.Image size={realestate.layout.agentAvatarSize} source={{ uri: agent.avatar.uri }} /> : <Avatar.Text size={realestate.layout.agentAvatarSize} label={initialsOf(agent.name)} />}
        <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
          <View style={styles.row}>
            <Text variant="titleSmall" numberOfLines={1} style={styles.flex}>
              {agent.name}
            </Text>
            {agent.verified ? (
              <View style={styles.row}>
                <Icon source="shield-check" size={13} color={realestate.colors.verified} />
                <Text variant="labelSmall" style={{ color: realestate.colors.verified, marginLeft: 3 }}>
                  Verified
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
            {ROLE_LABEL[agent.role ?? 'agent']}
            {agent.agency ? ` · ${agent.agency}` : ''}
          </Text>
          {agent.ratingLabel || agent.responseTimeLabel ? (
            <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
              {[agent.ratingLabel, agent.responseTimeLabel].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>

      {!compact ? (
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {onCall ? (
            <TouchableRipple
              onPress={onCall}
              disabled={agent.phoneAvailable === false}
              accessibilityRole="button"
              accessibilityLabel="Call, number is masked"
              style={[styles.actionButton, { borderColor: theme.colors.outlineVariant, opacity: agent.phoneAvailable === false ? 0.5 : 1 }]}
              testID={childTestID(id, 'call')}
            >
              <View style={styles.row}>
                <Icon source="phone-outline" size={16} color={theme.colors.primary} />
                <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 6 }}>
                  Call
                </Text>
              </View>
            </TouchableRipple>
          ) : null}
          {onWhatsApp ? (
            <TouchableRipple
              onPress={onWhatsApp}
              disabled={agent.whatsappAvailable === false}
              accessibilityRole="button"
              accessibilityLabel="Message on WhatsApp"
              style={[styles.actionButton, { borderColor: theme.colors.outlineVariant, opacity: agent.whatsappAvailable === false ? 0.5 : 1 }]}
              testID={childTestID(id, 'whatsapp')}
            >
              <View style={styles.row}>
                <Icon source="whatsapp" size={16} color={realestate.colors.success} />
                <Text variant="labelMedium" style={{ color: realestate.colors.success, marginLeft: 6 }}>
                  WhatsApp
                </Text>
              </View>
            </TouchableRipple>
          ) : null}
        </View>
      ) : null}

      {onEnquire ? (
        <TouchableRipple onPress={onEnquire} accessibilityRole="button" accessibilityLabel="Send enquiry" testID={childTestID(id, 'enquire')}>
          <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
            Send enquiry
          </Text>
        </TouchableRipple>
      ) : null}

      <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
        Calls and messages are relayed through the app — your number stays private.
      </Text>
    </View>
  );

  return compact ? (
    <View style={[containerStyle, style]} testID={id}>
      {content}
    </View>
  ) : (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      {content}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  actionButton: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
});
