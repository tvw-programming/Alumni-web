/**
 * USAGE — AgentContactCard
 *
 * Call and WhatsApp are two visually distinct buttons, never a single
 * ambiguous "Contact" action — a viewer can tell which channel they're
 * choosing before tapping.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PropertyAgent } from '../types/domain';
import { AgentContactCard } from './AgentContactCard';
import sample from './AgentContactCard.sample.json';

const { agents } = loadSample<{ agents: PropertyAgent[] }>(sample);

export const AgentContactCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {agents.map((agent) => (
        <AgentContactCard
          key={agent.id}
          agent={agent}
          onCall={() => toast.show('Calling via masked number…')}
          onWhatsApp={() => toast.show('Opening WhatsApp')}
          onEnquire={() => toast.success('Enquiry sent')}
        />
      ))}
    </ScrollView>
  );
};
