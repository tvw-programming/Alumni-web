import type { Money } from './money';

/**
 * Domain vocabulary shared across the fintech components.
 *
 * Note the deliberate split between LOADING and PENDING (cross-library standard):
 * `loading` means we are fetching data; `pending` means the user's action was
 * accepted but is not final. Conflating them is how apps end up telling someone
 * a payment succeeded when it has only been submitted.
 */

export type DataState = 'default' | 'loading' | 'error' | 'offline' | 'locked';

export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'reversed'
  | 'refunded'
  | 'failed'
  | 'declined'
  | 'canceled'
  | 'disputed';

export type TransactionKind =
  | 'card'
  | 'transfer'
  | 'cash'
  | 'directDebit'
  | 'fee'
  | 'refund'
  | 'recurring';

export type Direction = 'debit' | 'credit';

export interface Category {
  id: string;
  label: string;
  icon?: string;
  colorToken?: string;
}

export interface Transaction {
  id: string;
  merchantName: string;
  category?: Category;
  amount: Money;
  direction: Direction;
  status: TransactionStatus;
  /** ISO 8601. */
  date: string;
  kind: TransactionKind;
  /** Free-form secondary detail: fx rate, fee, installment, card suffix. */
  metadata?: Record<string, string>;
  /** Explains a pending hold or an expected reversal date. */
  statusExplanation?: string;
  expectedResolutionAt?: string;
  isDuplicateSuspect?: boolean;
}

export interface Action {
  key: string;
  label: string;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Rendered as the danger variant and confirmed before firing. */
  destructive?: boolean;
}

export interface Identifier {
  kind: 'phone' | 'email' | 'handle' | 'iban' | 'accountNumber' | 'upi';
  value: string;
  /** Presentation-safe rendering, e.g. "•••• 4821". */
  masked?: string;
}

export interface Payee {
  id: string;
  displayName: string;
  identifiers: Identifier[];
  avatarUrl?: string;
  verification: 'verified' | 'unverified' | 'unknown';
  type: 'person' | 'business' | 'bankBeneficiary';
  isFavorite?: boolean;
  isBlocked?: boolean;
  blockedReason?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'card' | 'wallet' | 'balance' | 'cash';
  label: string;
  /** Never a full card number. */
  maskedDetail?: string;
  currency?: string;
  availability: 'available' | 'loading' | 'unavailable';
  fee?: Money;
  deliveryEstimate?: string;
  badges?: string[];
  network?: CardNetwork;
  /** Why it cannot be picked. Computed by domain services, not this component. */
  disabledReason?: string;
}

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'rupay' | 'discover' | 'unknown';

export type CardStatus = 'active' | 'frozen' | 'expired' | 'pending' | 'terminated';

export type CardVariant = 'physical' | 'virtual' | 'disposable' | 'dark' | 'light' | 'branded';

export type TransactionResultStatus =
  | 'processing'
  | 'success'
  | 'pending'
  | 'failed'
  | 'declined'
  | 'reversed'
  | 'refunded';

export interface TransactionResult {
  status: TransactionResultStatus;
  title: string;
  description: string;
  transactionId?: string;
  amount?: Money;
  recipientName?: string;
  expectedResolutionAt?: string;
}

export type AuthState =
  | 'idle'
  | 'biometricPrompt'
  | 'pinEntry'
  | 'verifying'
  | 'success'
  | 'failure'
  | 'locked'
  | 'canceled';

export type VerificationDocumentStatus =
  | 'notStarted'
  | 'capturing'
  | 'uploaded'
  | 'processing'
  | 'manualReview'
  | 'approved'
  | 'rejected';

export interface VerificationDocument {
  type: string;
  label: string;
  sides: Array<'front' | 'back'>;
  status: VerificationDocumentStatus;
  rejectionReason?: string;
  retryable: boolean;
  /** Checklist shown before capture. */
  requirements?: string[];
}

export interface CategoryDatum {
  id: string;
  label: string;
  value: Money;
  percentage: number;
  /** Semantic token name from `fintech.tokens.json`, never a hex value. */
  colorToken?: string;
  transactionCount?: number;
}

export interface StatementFilters {
  date?: { preset?: string; from?: string; to?: string };
  types?: string[];
  statuses?: string[];
  accountIds?: string[];
  categoryIds?: string[];
  merchantQuery?: string;
}
