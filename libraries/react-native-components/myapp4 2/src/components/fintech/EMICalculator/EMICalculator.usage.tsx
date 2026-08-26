/**
 * USAGE — EMICalculator
 *
 * Includes a lender adapter, which is the mechanism for replacing the estimate
 * engine with the lender's binding calculation.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { formatMoney } from '../types/money';
import { EMICalculator, type EMICalculatorProps } from './EMICalculator';
import { calculateLoan, type LoanAdapter, type LoanResult } from './loanEngine';
import sample from './EMICalculator.sample.json';

const samples = loadSample<Record<string, EMICalculatorProps>>(sample);
type Product = 'personalLoan' | 'zeroInterestEMI' | 'autoLoanFlatRate';

export const EMICalculatorUsage = () => {
  const theme = useAppTheme();
  const [product, setProduct] = useState<Product>('personalLoan');
  const [latest, setLatest] = useState<LoanResult | null>(null);

  /**
   * A lender adapter: same inputs, lender-specific rounding. Here it rounds the
   * instalment up to the nearest whole rupee, which several Indian lenders do.
   */
  const lenderAdapter = useMemo<LoanAdapter>(
    () => ({
      calculate: (inputs, version) => {
        const base = calculateLoan(inputs, version);
        return { ...base, monthlyPayment: Math.ceil(base.monthlyPayment / 100) * 100 };
      },
    }),
    [],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={product}
        onValueChange={(next) => setProduct(next as Product)}
        buttons={[
          { value: 'personalLoan', label: 'Personal' },
          { value: 'zeroInterestEMI', label: '0% EMI' },
          { value: 'autoLoanFlatRate', label: 'Auto' },
        ]}
      />

      <EMICalculator
        // Remount per product so bounds and defaults reset cleanly.
        key={product}
        {...samples[product]!}
        adapter={lenderAdapter}
        onChange={(_inputs, result) => setLatest(result)}
        testID="emi-calculator"
      />

      {latest ? (
        <AppCard variant="filled" title="What the screen receives">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            monthlyPayment {formatMoney({ minorUnits: latest.monthlyPayment, currency: 'INR' })} · totalInterest{' '}
            {formatMoney({ minorUnits: latest.totalInterest, currency: 'INR' })} · {latest.schedule.length} instalments ·
            calculationVersion {latest.calculationVersion}
          </Text>
        </AppCard>
      ) : null}

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
