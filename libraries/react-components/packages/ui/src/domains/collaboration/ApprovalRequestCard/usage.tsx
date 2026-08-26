import { ApprovalRequestCard, type ApprovalRequest } from './ApprovalRequestCard';
import sample from './sample.json';

export function ApprovalRequestCardUsage() {
  const request = sample.request as ApprovalRequest;

  return (
    <ApprovalRequestCard
      request={request}
      onDecide={async (decision, comment) => {
        const response = await fetch(`/api/approvals/${request.id}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, comment }),
        });
        // 409 means another approver got there first — a conflict, not an
        // error the user caused.
        if (response.status === 409) {
          // A real Error, with the code attached: `toFailure` reads `code` and
          // `message` off whatever is thrown.
          throw Object.assign(new Error('This request was already resolved by someone else.'), {
            code: 'ALREADY_RESOLVED',
          });
        }
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
