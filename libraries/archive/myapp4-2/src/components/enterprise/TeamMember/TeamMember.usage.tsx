/**
 * USAGE — UserRoleChip + TeamMemberRow
 *
 * Presence and membership status always render as text next to the avatar —
 * "Online," "Invited," "Suspended" — never a coloured dot standing alone.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { TeamMember } from '../types/domain';
import { TeamMemberRow } from './TeamMemberRow';
import sample from './TeamMember.sample.json';

const { members } = loadSample<{ members: TeamMember[] }>(sample);

export const TeamMemberUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {members.map((member, index) => (
        <React.Fragment key={member.id}>
          <TeamMemberRow
            member={member}
            onPress={(item) => toast.show(`Opening ${item.name}'s profile`)}
            actions={[
              { key: 'change-role', label: 'Change role', onPress: () => toast.show(`Changing role for ${member.name}`) },
              { key: 'resend', label: 'Resend invitation', onPress: () => toast.success(`Invitation resent to ${member.name}`) },
              { key: 'remove', label: 'Remove member', destructive: true, onPress: () => toast.show(`Removing ${member.name}`) },
            ]}
          />
          {index < members.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
