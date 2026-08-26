import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { TeamMember } from '../types/domain';
import { UserRoleChip } from './UserRoleChip';

export interface RowAction {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface TeamMemberRowProps extends StyleEscapeHatches {
  member: TeamMember;
  actions?: RowAction[];
  onPress?: (member: TeamMember) => void;
}

const PRESENCE_META: Record<NonNullable<TeamMember['presence']>, { label: string; colorKey: 'success' | 'warning' | 'error' | 'onSurfaceVariant' }> = {
  online: { label: 'Online', colorKey: 'success' },
  away: { label: 'Away', colorKey: 'warning' },
  busy: { label: 'Busy', colorKey: 'error' },
  offline: { label: 'Offline', colorKey: 'onSurfaceVariant' },
};

const STATUS_LABEL: Partial<Record<NonNullable<TeamMember['status']>, string>> = {
  invited: 'Invited',
  pending: 'Pending',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};

/**
 * Presence and membership status are always plain text next to the avatar —
 * a coloured dot is decoration on top of the word "Online," never a
 * replacement for it.
 */
export const TeamMemberRow = ({ member, actions, onPress, style, containerStyle, testID }: TeamMemberRowProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `team-member-${member.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const presence = member.presence ? PRESENCE_META[member.presence] : undefined;
  const statusLabel = member.status ? STATUS_LABEL[member.status] : undefined;

  const a11yLabel = `${member.name}${member.role ? `, ${member.role}` : ''}${presence ? `, ${presence.label}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;

  return (
    <TouchableRipple onPress={onPress ? () => onPress(member) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} style={[containerStyle, style]} testID={id}>
      <View style={styles.row}>
        <View>
          {member.avatar?.uri ? <Avatar.Image size={enterprise.layout.avatarSize} source={{ uri: member.avatar.uri }} /> : <Avatar.Text size={enterprise.layout.avatarSize} label={initialsOf(member.name)} />}
          {presence ? <View style={[styles.presenceDot, { backgroundColor: enterprise.colors[presence.colorKey], borderColor: theme.colors.surface }]} accessibilityElementsHidden /> : null}
        </View>

        <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
          <View style={styles.row}>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.flex}>
              {member.name}
            </Text>
            {member.role ? <UserRoleChip role={member.role} tone={member.roleTone} /> : null}
          </View>
          {member.email ? (
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }} numberOfLines={1}>
              {member.email}
            </Text>
          ) : null}
          <View style={styles.row}>
            {presence ? (
              <Text variant="labelSmall" style={{ color: enterprise.colors[presence.colorKey] }}>
                {presence.label}
              </Text>
            ) : null}
            {statusLabel ? (
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: presence ? 8 : 0 }}>
                {statusLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {actions && actions.length > 0 ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" size={18} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${member.name}`} style={styles.noMargin} />}
          >
            {actions.map((action) => (
              <Menu.Item
                key={action.key}
                onPress={() => {
                  setMenuVisible(false);
                  action.onPress();
                }}
                title={action.label}
                titleStyle={action.destructive ? { color: theme.colors.error } : undefined}
                testID={childTestID(id, action.key)}
              />
            ))}
          </Menu>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  presenceDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  noMargin: { margin: 0 },
});
