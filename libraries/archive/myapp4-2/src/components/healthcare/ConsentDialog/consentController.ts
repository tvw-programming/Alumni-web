import { useCallback, useMemo, useState } from 'react';

import type { ConsentItem, ConsentRecord, ConsentState } from '../types/domain';

/**
 * Headless consent controller.
 *
 * Consent is a legal and safety workflow, not a UI affordance, so the decision
 * logic lives here and the presentation layer stays swappable. Two rules are
 * enforced structurally:
 *
 *   1. Optional consents start UNCHECKED. There is no code path that
 *      pre-selects one — pre-ticked optional consent is not consent.
 *   2. Consent is only ever recorded from an explicit action. Opening a policy,
 *      scrolling, or continuing past a screen never counts.
 */

export interface ConsentControllerOptions {
  items: ConsentItem[];
  subject: string;
  actor: string;
  /** Previously recorded decisions, e.g. after a policy-version bump. */
  existing?: ConsentRecord[];
}

export interface ConsentController {
  state: ConsentState;
  /** Item id → accepted. Optional items always begin false. */
  decisions: Record<string, boolean>;
  setDecision: (itemId: string, accepted: boolean) => void;
  /** Required items that are still unaccepted. */
  outstandingRequired: ConsentItem[];
  canSubmit: boolean;
  /** Builds the audit records for the accept action. */
  buildRecords: (method: ConsentRecord['method']) => ConsentRecord[];
  accept: () => ConsentRecord[];
  decline: () => ConsentRecord[];
  reset: () => void;
}

export const useConsentController = ({
  items,
  subject,
  actor,
  existing = [],
}: ConsentControllerOptions): ConsentController => {
  const initial = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const item of items) {
      const previous = existing.find((record) => record.itemId === item.id && record.version === item.version);
      // Only a matching version counts; a policy bump resets the decision.
      map[item.id] = previous?.accepted ?? false;
    }
    return map;
  }, [existing, items]);

  const [decisions, setDecisions] = useState<Record<string, boolean>>(initial);
  const [state, setState] = useState<ConsentState>('presented');

  const setDecision = useCallback((itemId: string, accepted: boolean) => {
    setDecisions((prev) => ({ ...prev, [itemId]: accepted }));
  }, []);

  const outstandingRequired = useMemo(
    () => items.filter((item) => item.required && !decisions[item.id]),
    [decisions, items],
  );

  const buildRecords = useCallback(
    (method: ConsentRecord['method']): ConsentRecord[] =>
      items.map((item) => ({
        itemId: item.id,
        version: item.version,
        accepted: !!decisions[item.id],
        subject,
        actor,
        method,
        recordedAt: new Date().toISOString(),
      })),
    [actor, decisions, items, subject],
  );

  const accept = useCallback(() => {
    const records = buildRecords('explicitButton');
    const anyOptionalDeclined = items.some((item) => !item.required && !decisions[item.id]);
    setState(anyOptionalDeclined ? 'partiallyAccepted' : 'accepted');
    return records;
  }, [buildRecords, decisions, items]);

  const decline = useCallback(() => {
    const records = items.map((item) => ({
      itemId: item.id,
      version: item.version,
      accepted: false,
      subject,
      actor,
      method: 'explicitButton' as const,
      recordedAt: new Date().toISOString(),
    }));
    setState('declined');
    return records;
  }, [actor, items, subject]);

  const reset = useCallback(() => {
    setDecisions(initial);
    setState('presented');
  }, [initial]);

  return {
    state,
    decisions,
    setDecision,
    outstandingRequired,
    canSubmit: outstandingRequired.length === 0,
    buildRecords,
    accept,
    decline,
    reset,
  };
};
