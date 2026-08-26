import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Icon, List, Text, TextInput } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { MoneyRow } from '@ui/molecules/MoneyRow';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { EmiInputs } from '../types/domain';

export interface EMICalculatorCardProps extends StyleEscapeHatches {
  inputs: EmiInputs;
  currency?: string;
  locale?: string;
  onChange: (inputs: EmiInputs) => void;
  onApply?: () => void;
  showSchedule?: boolean;
}

/**
 * The estimate is never framed as an approval — "Estimated monthly EMI" and
 * a standing disclaimer stay visible next to the result. Every slider has a
 * numeric text-input alternative reachable without dragging, and the EMI
 * math lives in one pure function so it never drifts from what a lender
 * adapter would compute.
 */
const calculateEmi = ({ loanAmount, annualRate, tenureMonths }: EmiInputs): { emi: number; totalInterest: number; totalRepayment: number } => {
  if (loanAmount <= 0 || tenureMonths <= 0) return { emi: 0, totalInterest: 0, totalRepayment: 0 };
  const monthlyRate = annualRate / 12 / 100;
  const emi =
    monthlyRate === 0
      ? loanAmount / tenureMonths
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const totalRepayment = emi * tenureMonths;
  return { emi: Math.round(emi), totalInterest: Math.round(totalRepayment - loanAmount), totalRepayment: Math.round(totalRepayment) };
};

export const EMICalculatorCard = ({ inputs, currency = 'INR', locale = 'en-IN', onChange, onApply, showSchedule = false, style, containerStyle, testID }: EMICalculatorCardProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'emi-calculator-card';
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const valid = inputs.loanAmount > 0 && inputs.annualRate > 0 && inputs.tenureMonths > 0;
  const result = useMemo(() => calculateEmi(inputs), [inputs]);

  const money = (minorUnits: number) => ({ minorUnits: Math.round(minorUnits * 100), currency });

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={styles.resultBlock}>
          <Text variant="labelMedium" style={{ color: realestate.colors.onSurfaceVariant }}>
            Estimated monthly EMI
          </Text>
          <Text variant="displaySmall" accessibilityLiveRegion="polite">
            {valid ? formatMoney(money(result.emi), { locale }) : '—'}
          </Text>
        </View>

        <SliderField
          label="Loan amount"
          valueLabel={formatMoney(money(inputs.loanAmount), { locale })}
          value={inputs.loanAmount}
          min={100000}
          max={50000000}
          step={50000}
          onChange={(v) => onChange({ ...inputs, loanAmount: v })}
          testID={childTestID(id, 'loan-amount')}
        />
        <SliderField
          label="Interest rate"
          valueLabel={`${inputs.annualRate.toFixed(2)}%`}
          value={inputs.annualRate}
          min={5}
          max={16}
          step={0.05}
          onChange={(v) => onChange({ ...inputs, annualRate: v })}
          testID={childTestID(id, 'interest-rate')}
        />
        <SliderField
          label="Loan tenure"
          valueLabel={`${Math.round(inputs.tenureMonths / 12)} years`}
          value={inputs.tenureMonths}
          min={12}
          max={360}
          step={12}
          onChange={(v) => onChange({ ...inputs, tenureMonths: v })}
          testID={childTestID(id, 'tenure')}
        />

        {!valid ? (
          <View style={styles.row}>
            <Icon source="alert-circle-outline" size={13} color={realestate.colors.error} />
            <Text variant="labelSmall" style={{ color: realestate.colors.error, marginLeft: 4 }}>
              Enter a loan amount, interest rate, and tenure to see an estimate.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 2 }}>
            <MoneyRow label="Principal" value={money(inputs.loanAmount)} locale={locale} />
            <MoneyRow label="Total interest" value={money(result.totalInterest)} locale={locale} />
            {inputs.processingFee ? <MoneyRow label="Processing fee" value={money(inputs.processingFee)} locale={locale} /> : null}
            <MoneyRow label="Total repayment" value={money(result.totalRepayment + (inputs.processingFee ?? 0))} emphasis="total" locale={locale} />
          </View>
        )}

        <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
          This is an estimate, not a loan approval or offer. Actual EMI depends on lender terms and eligibility.
        </Text>

        {showSchedule && valid ? (
          <List.Accordion title="Amortization schedule" expanded={scheduleOpen} onPress={() => setScheduleOpen((v) => !v)} left={(props) => <List.Icon {...props} icon="table" />}>
            <ScheduleTable inputs={inputs} money={money} locale={locale} />
          </List.Accordion>
        ) : null}

        {onApply ? (
          <AppButton variant="primary" size="lg" fullWidth disabled={!valid} onPress={onApply} testID={childTestID(id, 'apply')}>
            Check eligibility
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
};

const SliderField = ({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
  testID,
}: {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  const [text, setText] = useState(String(value));

  return (
    <View style={{ gap: 4 }}>
      <View style={styles.row}>
        <Text variant="labelMedium" style={styles.flex}>
          {label}
        </Text>
        <Text variant="labelMedium">{valueLabel}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={(v: number) => {
          onChange(v);
          setText(String(v));
        }}
        accessibilityLabel={`${label}, ${valueLabel}`}
        testID={testID}
      />
      <TextInput
        mode="outlined"
        dense
        keyboardType="decimal-pad"
        value={text}
        onChangeText={(t) => {
          setText(t);
          const numeric = Number(t);
          if (!Number.isNaN(numeric)) onChange(Math.min(max, Math.max(min, numeric)));
        }}
        style={{ backgroundColor: theme.colors.surface }}
        accessibilityLabel={`${label}, numeric entry`}
      />
    </View>
  );
};

const ScheduleTable = ({ inputs, money, locale }: { inputs: EmiInputs; money: (v: number) => { minorUnits: number; currency: string }; locale: string }) => {
  const theme = useAppTheme();
  const years = Math.min(5, Math.ceil(inputs.tenureMonths / 12));
  const { emi } = calculateEmi(inputs);
  let balance = inputs.loanAmount;
  const monthlyRate = inputs.annualRate / 12 / 100;
  const rows = Array.from({ length: years }, (_, yearIndex) => {
    let yearInterest = 0;
    let yearPrincipal = 0;
    for (let m = 0; m < 12 && yearIndex * 12 + m < inputs.tenureMonths; m++) {
      const interest = balance * monthlyRate;
      const principal = emi - interest;
      balance -= principal;
      yearInterest += interest;
      yearPrincipal += principal;
    }
    return { year: yearIndex + 1, principal: Math.round(yearPrincipal), interest: Math.round(yearInterest) };
  });

  return (
    <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: 4 }}>
      {rows.map((row) => (
        <View key={row.year} style={styles.row}>
          <Text variant="labelSmall" style={styles.flex}>
            Year {row.year}
          </Text>
          <Text variant="labelSmall">
            {formatMoney(money(row.principal), { locale })} principal · {formatMoney(money(row.interest), { locale })} interest
          </Text>
        </View>
      ))}
      {inputs.tenureMonths > years * 12 ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Showing first {years} years of {Math.round(inputs.tenureMonths / 12)}.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  resultBlock: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
