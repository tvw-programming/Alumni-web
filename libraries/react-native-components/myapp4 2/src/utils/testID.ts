/**
 * `testID="checkout-email"` should give QA `checkout-email-input`,
 * `checkout-email-error`, … automatically. Never hand-roll child ids.
 */
export const childTestID = (testID: string | undefined, suffix: string): string | undefined =>
  testID ? `${testID}-${suffix}` : undefined;
