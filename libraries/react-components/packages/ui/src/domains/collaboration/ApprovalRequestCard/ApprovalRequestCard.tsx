import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { describe, timeLabel, useAction } from '../../../foundation';

export type ApprovalDecision = 'approve' | 'reject' | 'reassign';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'resolvedElsewhere';

export interface ApprovalRequest {
  id: string;
  title: string;
  requester: { name: string; avatarUri?: string };
  submittedAt: string;
  summary: string;
  /** Label/value pairs — amount, cost centre, dates. */
  details?: { label: string; value: string }[];
  status: ApprovalStatus;
}

export interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  onDecide: (decision: ApprovalDecision, comment: string) => Promise<void>;
}

/**
 * An approval waiting on the viewer.
 *
 * Two rules:
 *
 * - **A rejection requires a reason.** An approval trail with "rejected" and no
 *   comment is unusable at review time, and the requester cannot act on it.
 *   Approving may be silent; rejecting may not.
 * - **"Already resolved" is a real state.** Two approvers open the same request
 *   constantly; the second one must be told what happened rather than shown a
 *   generic error.
 */
export function ApprovalRequestCard({ request, onDecide }: ApprovalRequestCardProps) {
  const [dialog, setDialog] = useState<ApprovalDecision | null>(null);
  const [comment, setComment] = useState('');

  const [result, decide, pending] = useAction<ApprovalDecision, ApprovalDecision>(
    async (_previous, decision) => {
      await onDecide(decision, comment);
      return decision;
    },
  );

  const status: ApprovalStatus =
    result.status === 'success'
      ? result.data === 'approve'
        ? 'approved'
        : 'rejected'
      : request.status;

  const settled = status !== 'pending';
  const rejecting = dialog === 'reject';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar src={request.requester.avatarUri} alt="" sx={{ width: 36, height: 36 }}>
            {request.requester.name.charAt(0)}
          </Avatar>

          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              aria-label={describe(
                request.title,
                `requested by ${request.requester.name}`,
                timeLabel(request.submittedAt),
                status,
              )}
            >
              {request.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {`${request.requester.name} · ${timeLabel(request.submittedAt)}`}
            </Typography>
          </Stack>

          <Chip
            size="small"
            variant="outlined"
            color={
              status === 'approved'
                ? 'success'
                : status === 'rejected'
                  ? 'error'
                  : status === 'resolvedElsewhere'
                    ? 'default'
                    : 'warning'
            }
            label={
              status === 'pending'
                ? 'Awaiting you'
                : status === 'approved'
                  ? 'Approved'
                  : status === 'rejected'
                    ? 'Rejected'
                    : 'Already resolved'
            }
          />
        </Stack>

        <Typography variant="body2" sx={{ mt: 1.5 }}>
          {request.summary}
        </Typography>

        {request.details?.length ? (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={0.5}>
              {request.details.map((detail) => (
                <Stack
                  key={detail.label}
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography variant="caption" color="text.secondary">
                    {detail.label}
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {detail.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        ) : null}

        {status === 'resolvedElsewhere' ? (
          <Alert severity="info" sx={{ mt: 2 }} role="status">
            This request was already resolved by someone else.
          </Alert>
        ) : null}

        {result.status === 'error' || result.status === 'conflict' ? (
          <Alert
            severity={result.status === 'conflict' ? 'info' : 'error'}
            sx={{ mt: 2 }}
            role="alert"
          >
            {result.message}
          </Alert>
        ) : null}

        {!settled ? (
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              size="small"
              disabled={pending}
              onClick={() => {
                setDialog('reassign');
              }}
            >
              Reassign
            </Button>
            <Button
              size="small"
              color="error"
              disabled={pending}
              onClick={() => {
                setDialog('reject');
              }}
            >
              Reject
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={pending}
              onClick={() => {
                decide('approve');
              }}
            >
              {pending ? 'Working…' : 'Approve'}
            </Button>
          </Stack>
        ) : null}
      </CardContent>

      <Dialog
        open={dialog !== null}
        onClose={() => {
          setDialog(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{rejecting ? 'Reject request' : 'Reassign request'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label={rejecting ? 'Reason (required)' : 'Note (optional)'}
            value={comment}
            error={rejecting && comment.trim() === ''}
            helperText={
              rejecting && comment.trim() === '' ? 'A reason is required to reject.' : ' '
            }
            onChange={(event) => {
              setComment(event.target.value);
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialog(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={rejecting ? 'error' : 'primary'}
            // A rejection with no reason is unusable at review time.
            disabled={rejecting && comment.trim() === ''}
            onClick={() => {
              const decision = dialog;
              setDialog(null);
              if (decision) decide(decision);
            }}
          >
            {rejecting ? 'Reject' : 'Reassign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
