/**
 * Loan calculation engine — pure, UI-free, and independently testable.
 *
 * IMPORTANT: this is an *estimate* engine. Real lending products differ on
 * compounding convention, day-count basis, rounding direction and fee treatment,
 * and those differences are usually regulated. `LoanAdapter` exists so a lender's
 * exact rules can replace this maths without touching the component.
 */

export type RepaymentMethod = 'reducingBalance' | 'flat';

export interface LoanInputs {
  /** Minor units. */
  principal: number;
  /** Annual nominal rate as a percentage, e.g. 10.5. */
  annualRate: number;
  termMonths: number;
  /** Processing fee in minor units. */
  fee?: number;
  repaymentMethod?: RepaymentMethod;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanResult {
  monthlyPayment: number;
  totalInterest: number;
  totalFees: number;
  totalRepayment: number;
  schedule: AmortizationRow[];
  /** Guards against a stale async result overwriting newer inputs. */
  calculationVersion: number;
}

export interface LoanAdapter {
  calculate: (inputs: LoanInputs, version: number) => LoanResult;
}

/** Rounds to whole minor units — money is never fractional. */
const round = (value: number): number => Math.round(value);

/**
 * Reducing balance:  EMI = P·r·(1+r)^n / ((1+r)^n − 1)
 * Flat:              interest = P · annualRate · years, spread evenly.
 */
export const calculateLoan = (inputs: LoanInputs, version = 0): LoanResult => {
  const { principal, annualRate, termMonths, fee = 0, repaymentMethod = 'reducingBalance' } = inputs;

  if (principal <= 0 || termMonths <= 0) {
    return { monthlyPayment: 0, totalInterest: 0, totalFees: fee, totalRepayment: fee, schedule: [], calculationVersion: version };
  }

  const monthlyRate = annualRate / 100 / 12;

  if (repaymentMethod === 'flat') {
    const totalInterest = round((principal * (annualRate / 100) * termMonths) / 12);
    const monthlyPayment = round((principal + totalInterest) / termMonths);
    const monthlyPrincipal = round(principal / termMonths);
    const monthlyInterest = round(totalInterest / termMonths);

    const schedule: AmortizationRow[] = Array.from({ length: termMonths }, (_, i) => ({
      month: i + 1,
      payment: monthlyPayment,
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      balance: Math.max(0, principal - monthlyPrincipal * (i + 1)),
    }));

    return {
      monthlyPayment,
      totalInterest,
      totalFees: fee,
      totalRepayment: principal + totalInterest + fee,
      schedule,
      calculationVersion: version,
    };
  }

  // Zero-interest loans are a real product, and the standard formula divides by
  // zero for them.
  const monthlyPayment =
    monthlyRate === 0
      ? round(principal / termMonths)
      : round(
          (principal * monthlyRate * (1 + monthlyRate) ** termMonths) /
            ((1 + monthlyRate) ** termMonths - 1),
        );

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let month = 1; month <= termMonths; month += 1) {
    const interest = round(balance * monthlyRate);
    // Final instalment absorbs accumulated rounding so the balance lands on 0.
    const isLast = month === termMonths;
    const principalPart = isLast ? balance : monthlyPayment - interest;
    const payment = isLast ? balance + interest : monthlyPayment;

    balance = Math.max(0, balance - principalPart);
    totalInterest += interest;
    schedule.push({ month, payment, principal: principalPart, interest, balance });
  }

  return {
    monthlyPayment,
    totalInterest,
    totalFees: fee,
    totalRepayment: principal + totalInterest + fee,
    schedule,
    calculationVersion: version,
  };
};

export const defaultLoanAdapter: LoanAdapter = { calculate: calculateLoan };
