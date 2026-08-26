import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { DataTable, Divider, List, SegmentedButtons, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { StateView } from '@ui/molecules/StateView';
import { useDebouncedValue } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney, precisionFor } from '../types/money';
import {
  defaultLoanAdapter,
  type LoanAdapter,
  type LoanInputs,
  type LoanResult,
  type RepaymentMethod,
} from './loanEngine';

export interface EMICalculatorProps extends StyleEscapeHatches {
  currency?: string;
  locale?: string;
  /** Bounds in minor units. */
  minPrincipal?: number;
  maxPrincipal?: number;
  minRate?: number;
  maxRate?: number;
  minTermMonths?: number;
  maxTermMonths?: number;
  defaults?: Partial<LoanInputs>;
  /** Swap in the lender's exact compounding/rounding rules. */
  adapter?: LoanAdapter;
  /** Regulatory text. Required in most markets — surface it, do not hide it. */
  disclosures?: string[];
  showSchedule?: boolean;
  /** True while a real offer is being fetched from the lender. */
  fetchingOffer?: boolean;
  offerExpired?: boolean;
  onChange?: (inputs: LoanInputs, result: LoanResult) => void;
  onApply?: (inputs: LoanInputs, result: LoanResult) => void;
}

/**
 * Repayment estimator.
 *
 * The slider is never the only input — Material's guidance and plain usability
 * both require an exact-entry path, so every slider is paired with a text field.
 */
export const EMICalculator = ({
  currency = 'INR',
  locale = 'en-IN',
  minPrincipal = 1000000,
  maxPrincipal = 500000000,
  minRate = 5,
  maxRate = 24,
  minTermMonths = 6,
  maxTermMonths = 84,
  defaults,
  adapter = defaultLoanAdapter,
  disclosures = [],
  showSchedule = true,
  fetchingOffer = false,
  offerExpired = false,
  onChange,
  onApply,
  style,
  containerStyle,
  testID,
}: EMICalculatorProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const precision = precisionFor(currency);

  const [principal, setPrincipal] = useState(defaults?.principal ?? 25000000);
  const [annualRate, setAnnualRate] = useState(defaults?.annualRate ?? 11.5);
  const [termMonths, setTermMonths] = useState(defaults?.termMonths ?? 36);
  const [fee, setFee] = useState(defaults?.fee ?? 0);
  const [method, setMethod] = useState<RepaymentMethod>(defaults?.repaymentMethod ?? 'reducingBalance');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const inputs = useMemo<LoanInputs>(
    () => ({ principal, annualRate, termMonths, fee, repaymentMethod: method }),
    [annualRate, fee, method, principal, termMonths],
  );

  // Debounced so dragging a slider does not recompute an 84-row schedule per frame.
  const debouncedInputs = useDebouncedValue(inputs, 120);
  const version = useRef(0);

  const result = useMemo(() => {
    version.current += 1;
    return adapter.calculate(debouncedInputs, version.current);
  }, [adapter, debouncedInputs]);

  useEffect(() => {
    onChange?.(debouncedInputs, result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const asMajor = useCallback((minor: number) => (minor / 10 ** precision).toFixed(0), [precision]);
  const fromMajor = useCallback(
    (text: string) => Math.round((Number.parseFloat(text.replace(/[^\d.]/g, '')) || 0) * 10 ** precision),
    [precision],
  );

  const invalid = principal < minPrincipal || principal > maxPrincipal || termMonths < minTermMonths;

  if (offerExpired) {
    return (
      <StateView
        preset="error"
        title="This offer has expired"
        description="Rates change often. Request a fresh quote to see accurate figures."
        primaryAction={onApply ? { label: 'Get a new quote', onPress: () => onApply(inputs, result) } : undefined}
        testID={childTestID(testID, 'expired')}
      />
    );
  }

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={testID}>
      {/* The answer first, inputs below it. */}
      <AppCard variant="filled" entering="fade">
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Estimated monthly payment
        </Text>
        <Text variant="displaySmall" style={[styles.tabular, { color: fintech.colors.amountDebit }]}>
          {fetchingOffer ? '—' : formatMoney({ minorUnits: result.monthlyPayment, currency }, { locale })}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {termMonths} monthly instalments · {annualRate.toFixed(2)}% p.a. ·{' '}
          {method === 'reducingBalance' ? 'reducing balance' : 'flat rate'}
        </Text>
      </AppCard>

      <AppCard variant="outlined" title="Adjust your loan">
        <ControlRow
          label="Loan amount"
          value={formatMoney({ minorUnits: principal, currency }, { locale })}
          sliderValue={principal}
          min={minPrincipal}
          max={maxPrincipal}
          step={100000}
          onSlide={setPrincipal}
          textValue={asMajor(principal)}
          onTextChange={(text) => setPrincipal(fromMajor(text))}
          testID={childTestID(testID, 'principal')}
        />

        <ControlRow
          label="Interest rate (annual)"
          value={`${annualRate.toFixed(2)}%`}
          sliderValue={annualRate}
          min={minRate}
          max={maxRate}
          step={0.05}
          onSlide={setAnnualRate}
          textValue={annualRate.toFixed(2)}
          onTextChange={(text) => setAnnualRate(Number.parseFloat(text) || 0)}
          testID={childTestID(testID, 'rate')}
        />

        <ControlRow
          label="Tenure"
          value={`${termMonths} months`}
          sliderValue={termMonths}
          min={minTermMonths}
          max={maxTermMonths}
          step={1}
          onSlide={(next) => setTermMonths(Math.round(next))}
          textValue={String(termMonths)}
          onTextChange={(text) => setTermMonths(Number.parseInt(text, 10) || minTermMonths)}
          testID={childTestID(testID, 'term')}
        />

        <View style={{ marginTop: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ marginBottom: theme.spacing.xs }}>
            Repayment method
          </Text>
          <SegmentedButtons
            value={method}
            onValueChange={(next) => setMethod(next as RepaymentMethod)}
            buttons={[
              { value: 'reducingBalance', label: 'Reducing' },
              { value: 'flat', label: 'Flat' },
            ]}
          />
        </View>

        <AppTextInput
          label="Processing fee"
          value={asMajor(fee)}
          onChangeText={(text) => setFee(fromMajor(text))}
          keyboardType="number-pad"
          containerStyle={{ marginTop: theme.spacing.sm }}
          testID={childTestID(testID, 'fee')}
        />

        {invalid ? (
          <Text variant="labelSmall" style={{ color: fintech.colors.statusError }}>
            Enter an amount between {formatMoney({ minorUnits: minPrincipal, currency }, { locale })} and{' '}
            {formatMoney({ minorUnits: maxPrincipal, currency }, { locale })}.
          </Text>
        ) : null}
      </AppCard>

      <AppCard variant="outlined" title="What it costs">
        <SummaryRow label="Principal" value={formatMoney({ minorUnits: principal, currency }, { locale })} />
        <SummaryRow label="Total interest" value={formatMoney({ minorUnits: result.totalInterest, currency }, { locale })} />
        <SummaryRow label="Fees" value={formatMoney({ minorUnits: result.totalFees, currency }, { locale })} />
        <Divider style={{ marginVertical: theme.spacing.sm }} />
        <SummaryRow label="Total repayment" value={formatMoney({ minorUnits: result.totalRepayment, currency }, { locale })} emphasis />
      </AppCard>

      {showSchedule ? (
        <AppCard variant="outlined" padded={false}>
          <List.Accordion
            title="Repayment schedule"
            expanded={scheduleOpen}
            onPress={() => setScheduleOpen((prev) => !prev)}
            testID={childTestID(testID, 'schedule')}
          >
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Month</DataTable.Title>
                <DataTable.Title numeric>Payment</DataTable.Title>
                <DataTable.Title numeric>Interest</DataTable.Title>
                <DataTable.Title numeric>Balance</DataTable.Title>
              </DataTable.Header>
              {result.schedule.slice(0, 12).map((row) => (
                <DataTable.Row key={row.month}>
                  <DataTable.Cell>{row.month}</DataTable.Cell>
                  <DataTable.Cell numeric>{formatMoney({ minorUnits: row.payment, currency }, { locale, omitSymbol: true })}</DataTable.Cell>
                  <DataTable.Cell numeric>{formatMoney({ minorUnits: row.interest, currency }, { locale, omitSymbol: true })}</DataTable.Cell>
                  <DataTable.Cell numeric>{formatMoney({ minorUnits: row.balance, currency }, { locale, omitSymbol: true })}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
            {result.schedule.length > 12 ? (
              <Text variant="labelSmall" style={{ padding: theme.spacing.md, color: theme.colors.onSurfaceVariant }}>
                Showing the first 12 of {result.schedule.length} instalments.
              </Text>
            ) : null}
          </List.Accordion>
        </AppCard>
      ) : null}

      {/* Assumptions stay visible — an estimate presented as a quote is a
          compliance problem, not a UX one. */}
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          This is an estimate. Your lender's exact compounding, rounding and fees may differ.
        </Text>
        {disclosures.map((line) => (
          <Text key={line} variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
};

const ControlRow = ({
  label,
  value,
  sliderValue,
  min,
  max,
  step,
  onSlide,
  textValue,
  onTextChange,
  testID,
}: {
  label: string;
  value: string;
  sliderValue: number;
  min: number;
  max: number;
  step: number;
  onSlide: (value: number) => void;
  textValue: string;
  onTextChange: (text: string) => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      <View style={styles.labelRow}>
        <Text variant="labelMedium" style={styles.flex}>
          {label}
        </Text>
        <Text variant="labelMedium" style={styles.tabular}>
          {value}
        </Text>
      </View>

      <Slider
        value={sliderValue}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onSlide}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.surfaceVariant}
        thumbTintColor={theme.colors.primary}
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: sliderValue, text: value }}
        testID={childTestID(testID, 'slider')}
      />

      {/* The exact-entry path that the slider alone cannot provide. */}
      <AppTextInput
        value={textValue}
        onChangeText={onTextChange}
        keyboardType="decimal-pad"
        size="sm"
        label={`${label} (exact)`}
        testID={childTestID(testID, 'input')}
      />
    </View>
  );
};

const SummaryRow = ({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) => (
  <View style={styles.labelRow}>
    <Text variant={emphasis ? 'titleMedium' : 'bodyMedium'} style={styles.flex}>
      {label}
    </Text>
    <Text variant={emphasis ? 'titleMedium' : 'bodyMedium'} style={styles.tabular}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
