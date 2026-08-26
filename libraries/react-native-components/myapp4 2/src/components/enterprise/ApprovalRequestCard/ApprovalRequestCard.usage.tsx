/**
 * USAGE — ApprovalRequestCard
 *
 * Rejecting always opens a reason field first — "Confirm rejection" stays
 * disabled until a reason is typed, so a reject can never fire with no
 * explanation attached.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ApprovalRequest } from '../types/domain';
import { ApprovalRequestCard } from './ApprovalRequestCard';
import sample from './ApprovalRequestCard.sample.json';

const { requests: initial } = loadSample<{ requests: ApprovalRequest[] }>(sample);

export const ApprovalRequestCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [requests, setRequests] = useState(initial);
  const [processing, setProcessing] = useState<Record<string, 'approving' | 'rejecting' | null>>({});

  const handleApprove = (request: ApprovalRequest) => {
    setProcessing((prev) => ({ ...prev, [request.id]: 'approving' }));
    setTimeout(() => {
      setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: 'approved', resolvedBy: { id: 'me', name: 'You' } } : r)));
      setProcessing((prev) => ({ ...prev, [request.id]: null }));
      toast.success('Request approved');
    }, 700);
  };

  const handleReject = (request: ApprovalRequest, reason: string) => {
    setProcessing((prev) => ({ ...prev, [request.id]: 'rejecting' }));
    setTimeout(() => {
      setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: 'rejected', resolvedBy: { id: 'me', name: 'You' }, resolvedNote: reason } : r)));
      setProcessing((prev) => ({ ...prev, [request.id]: null }));
      toast.show('Request rejected');
    }, 700);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {requests.map((request) => (
        <ApprovalRequestCard
          key={request.id}
          request={request}
          canApprove
          processing={processing[request.id] ?? null}
          onApprove={() => handleApprove(request)}
          onReject={(reason) => handleReject(request, reason)}
          onReassign={() => toast.show('Opening reassign options')}
          onOpenDetails={() => toast.show(`Opening details for ${request.title}`)}
        />
      ))}
    </ScrollView>
  );
};
