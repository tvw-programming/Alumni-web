import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, List, Switch, Text } from 'react-native-paper';

import {
  AppButton,
  AppCard,
  AvatarStack,
  DateRangePicker,
  SegmentedTabs,
  SkeletonList,
  StatusBadge,
  StateView,
  useConfirm,
  useSheet,
  useToast,
  type DateRange,
} from '@ui';
import { FormRenderer, SchemaRenderer } from '@/schema';
import kycForm from '@/schema/fallback/kyc.form.json';
import homeScreen from '@/schema/fallback/home.screen.json';
import { useAppTheme, useThemeControl } from '@/theme';
import { usePreferencesStore } from '@/store';

type Demo = 'showcase' | 'sdui-form' | 'sdui-screen';

const DEMOS = [
  { key: 'showcase', label: 'Showcase' },
  { key: 'sdui-form', label: 'Schema form' },
  { key: 'sdui-screen', label: 'Schema screen' },
];

const TEAM = [
  { id: 't1', name: 'Ravi Kumar' },
  { id: 't2', name: 'Sara Iyer' },
  { id: 't3', name: 'Mo Khan' },
];

/**
 * Doubles as the library's living showcase — the same components the rest of
 * the app uses, plus both schema-driven surfaces side by side.
 */
export const ProfileScreen = () => {
  const theme = useAppTheme();
  const { scheme, toggle } = useThemeControl();
  const toast = useToast();
  const confirm = useConfirm();
  const sheet = useSheet();
  const clearRecents = usePreferencesStore((state) => state.clearRecentSearches);

  const [demo, setDemo] = useState<Demo>('showcase');
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [submitting, setSubmitting] = useState(false);

  const handleKycSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSubmitting(false);
      toast.success('Submitted for review');
      if (__DEV__) console.log('KYC values', values);
    },
    [toast],
  );

  const handleSignOut = useCallback(async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to see your orders.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (ok) toast.show('Signed out');
  }, [confirm, toast]);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <AppCard variant="elevated" entering="fade" testID="profile-header">
        <View style={[styles.row, { gap: theme.spacing.md }]}>
          <AvatarStack users={TEAM} size="lg" max={3} />
          <View style={styles.flex}>
            <Text variant="titleMedium">Tejasvi Waghulde</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              waghulde.tejas@gmail.com
            </Text>
          </View>
          <StatusBadge status="verified" size="sm" withDot />
        </View>
      </AppCard>

      <SegmentedTabs
        items={DEMOS}
        value={demo}
        onChange={(key) => setDemo(key as Demo)}
        variant="segmented"
        testID="profile-demo-tabs"
      />

      {demo === 'showcase' && (
        <>
          <AppCard variant="outlined" title="Appearance">
            <List.Item
              title="Dark theme"
              description="Follows the system by default"
              right={() => <Switch value={scheme === 'dark'} onValueChange={toggle} accessibilityLabel="Toggle dark theme" />}
            />
            <Divider />
            <List.Item
              title="Clear recent searches"
              onPress={() => {
                clearRecents();
                toast.show('Recent searches cleared');
              }}
              right={() => <List.Icon icon="chevron-right" />}
            />
          </AppCard>

          <AppCard variant="outlined" title="Date range">
            <DateRangePicker
              value={range}
              onChange={setRange}
              mode="range"
              label="Order history"
              containerStyle={{ marginTop: theme.spacing.sm }}
              testID="profile-range"
            />
          </AppCard>

          <AppCard variant="outlined" title="Feedback surfaces">
            <View style={[styles.wrap, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
              <AppButton variant="secondary" size="sm" onPress={() => toast.success('Saved')}>
                Toast
              </AppButton>
              <AppButton variant="secondary" size="sm" onPress={() => toast.error('Something broke', { action: { label: 'Retry', onPress: () => toast.show('Retrying') } })}>
                Error toast
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                onPress={() =>
                  sheet.open(<StateView preset="success" title="It worked" description="This sheet was opened imperatively." />, {
                    variant: 'center',
                    title: 'Centered sheet',
                  })
                }
              >
                Sheet
              </AppButton>
              <AppButton variant="danger" size="sm" onPress={() => void handleSignOut()}>
                Sign out
              </AppButton>
            </View>
          </AppCard>

          <AppCard variant="outlined" title="Skeletons">
            <SkeletonList of="listItem" count={3} containerStyle={{ marginTop: theme.spacing.sm }} />
          </AppCard>
        </>
      )}

      {demo === 'sdui-form' && (
        <AppCard variant="outlined" padded={false}>
          <View style={{ height: 560 }}>
            <FormRenderer schema={kycForm} onSubmit={handleKycSubmit} submitting={submitting} testID="kyc" />
          </View>
        </AppCard>
      )}

      {demo === 'sdui-screen' && (
        <AppCard variant="outlined" title="Rendered from JSON">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.sm }}>
            The last node is an unknown type — in release builds it is skipped, here it is flagged.
          </Text>
          <SchemaRenderer schema={homeScreen} fallback={homeScreen} testID="sdui-home" />
        </AppCard>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1 },
});
