/**
 * FINTECH COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Nothing here
 * imports from `src/features`, `src/store`, or `src/services` — the same
 * portability rule as the base library.
 *
 * Architectural rule from the spec, enforced by construction: financial logic,
 * state transitions and sensitive-data handling live OUTSIDE these components.
 * They render explicit typed states and emit intent. Payment orchestration,
 * fraud checks, permissions, calculations and backend truth stay in services.
 *
 * Concretely, that is why:
 *   - `PinPad` never validates a PIN         (the caller does)
 *   - `PaymentMethodSelector` never computes availability   (`disabledReason` is passed in)
 *   - `KYCUploader` never opens a camera     (`onCapture` is injected)
 *   - `CardVisual` has no prop that accepts a full card number
 *   - `EMICalculator` delegates to a `LoanAdapter` for lender-exact maths
 */

// Foundations
export * from './theme/fintechTokens';
export * from './types';
export * from './primitives/Keypad';

// Components
export * from './BalanceCard';
export * from './TransactionListItem';
export * from './AmountKeypad';
export * from './PinPad';
export * from './PaymentMethodSelector';
export * from './CardVisual';
export * from './PayeeSelector';
export * from './TransactionStatusSheet';
export * from './KYCUploader';
export * from './SpendingCategoryChart';
export * from './EMICalculator';
export * from './StatementFilterSheet';
