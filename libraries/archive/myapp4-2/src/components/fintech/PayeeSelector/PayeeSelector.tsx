import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Chip, Icon, Text } from 'react-native-paper';

import { ListItemRow } from '@ui/molecules/ListItemRow';
import { SearchHeader } from '@ui/organisms/SearchHeader';
import { SkeletonList } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useControllableState, useDebouncedValue, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import type { Identifier, Payee } from '../types/domain';

/** Search adapters — local-first, remote-first, or hybrid. */
export interface PayeeSearchAdapter {
  /** Already-known payees, available offline. */
  local?: (query: string) => Payee[];
  /** Remote lookup by handle/phone/email. Debounced by the component. */
  remote?: (query: string) => Promise<Payee[]>;
}

export const primaryIdentifier = (payee: Payee): Identifier | undefined => payee.identifiers[0];

export const formatIdentifier = (identifier?: Identifier): string => {
  if (!identifier) return '';
  return identifier.masked ?? identifier.value;
};

export interface PayeeSelectorProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  adapter: PayeeSearchAdapter;
  recents?: Payee[];
  favorites?: Payee[];
  selected?: string[];
  defaultSelected?: string[];
  onChange?: (ids: string[], payees: Payee[]) => void;
  mode?: 'single' | 'multi';
  debounceMs?: number;
  /** Contacts are an enhancement, never a prerequisite for sending money. */
  contactPermission?: 'granted' | 'denied' | 'unavailable';
  onRequestContactPermission?: () => void;
  onAddNewPayee?: () => void;
  onScanQR?: () => void;
  placeholder?: string;
}

/**
 * Search-first recipient picker.
 *
 * Contact-book access is treated as optional throughout: with permission denied
 * the user can still search by handle, phone or email, because blocking a
 * payment on an address-book permission is a self-inflicted conversion problem.
 */
export const PayeeSelector = forwardRef<View, PayeeSelectorProps>(function PayeeSelector(
  {
    adapter,
    recents = [],
    favorites = [],
    selected,
    defaultSelected = [],
    onChange,
    mode = 'single',
    debounceMs = 300,
    contactPermission = 'granted',
    onRequestContactPermission,
    onAddNewPayee,
    onScanQR,
    placeholder = 'Name, @handle, phone or email',
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const fintech = useFintechTheme();

  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<Payee[]>([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebouncedValue(query, debounceMs);

  const [ids, setIds] = useControllableState<string[]>({
    value: selected,
    defaultValue: defaultSelected,
    onChange: undefined,
  });

  const localResults = useMemo(
    () => (debounced ? (adapter.local?.(debounced) ?? []) : []),
    [adapter, debounced],
  );

  React.useEffect(() => {
    if (!debounced || !adapter.remote) {
      setRemoteResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    adapter
      .remote(debounced)
      .then((results) => {
        if (!cancelled) setRemoteResults(results);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, debounced]);

  /** Local first, then remote, de-duplicated by id. */
  const results = useMemo(() => {
    const seen = new Set<string>();
    return [...localResults, ...remoteResults].filter((payee) => {
      if (seen.has(payee.id)) return false;
      seen.add(payee.id);
      return true;
    });
  }, [localResults, remoteResults]);

  const select = useCallback(
    (payee: Payee) => {
      if (payee.isBlocked) return;
      const pool = [...results, ...recents, ...favorites];
      const next = mode === 'single'
        ? [payee.id]
        : ids.includes(payee.id)
          ? ids.filter((id) => id !== payee.id)
          : [...ids, payee.id];
      setIds(next);
      onChange?.(next, pool.filter((p) => next.includes(p.id)));
    },
    [favorites, ids, mode, onChange, recents, results, setIds],
  );

  const renderPayee = useCallback(
    (payee: Payee, index: number) => {
      const identifier = primaryIdentifier(payee);
      const isSelected = ids.includes(payee.id);

      return (
        <ListItemRow
          key={payee.id}
          title={payee.displayName}
          // The exact handle is always visible — display names collide.
          subtitle={[formatIdentifier(identifier), payee.type === 'business' ? 'Business' : undefined]
            .filter(Boolean)
            .join(' · ')}
          leading={
            payee.avatarUrl ? (
              <Avatar.Image size={theme.sizing.avatar.md} source={{ uri: payee.avatarUrl }} />
            ) : (
              <Avatar.Text size={theme.sizing.avatar.md} label={initialsOf(payee.displayName)} />
            )
          }
          trailing={
            <View style={styles.trailing}>
              {payee.verification === 'verified' ? (
                <Icon source="check-decagram" size={18} color={fintech.colors.statusSuccess} />
              ) : payee.verification === 'unverified' ? (
                <Icon source="alert-circle-outline" size={18} color={fintech.colors.statusPending} />
              ) : null}
              {isSelected ? <Icon source="check" size={20} color={theme.colors.primary} /> : null}
            </View>
          }
          selected={isSelected}
          disabled={payee.isBlocked}
          onPress={() => select(payee)}
          animated={animated}
          index={index}
          testID={childTestID(testID, `payee-${payee.id}`)}
        />
      );
    },
    [animated, fintech.colors, ids, select, testID, theme.sizing.avatar.md, theme.colors.primary],
  );

  const showDiscovery = query.length === 0;

  return (
    <View ref={ref} style={[styles.flex, containerStyle, style]} testID={testID}>
      <SearchHeader
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        animated={animated}
        testID={childTestID(testID, 'search')}
      />

      <View style={[styles.quickRow, { paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }]}>
        {onScanQR ? (
          <Chip icon="qrcode-scan" onPress={onScanQR} testID={childTestID(testID, 'scan')}>
            Scan QR
          </Chip>
        ) : null}
        {onAddNewPayee ? (
          <Chip icon="account-plus-outline" onPress={onAddNewPayee} testID={childTestID(testID, 'add')}>
            New payee
          </Chip>
        ) : null}
      </View>

      {contactPermission === 'denied' ? (
        <View style={{ padding: theme.spacing.md }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Contacts are off, so we cannot suggest people you know. You can still search by @handle, phone or email.
            {onRequestContactPermission ? ' Tap to allow contacts.' : ''}
          </Text>
        </View>
      ) : null}

      {showDiscovery ? (
        <View>
          {favorites.length > 0 ? (
            <>
              <SectionLabel>Favourites</SectionLabel>
              {favorites.map(renderPayee)}
            </>
          ) : null}
          {recents.length > 0 ? (
            <>
              <SectionLabel>Recent</SectionLabel>
              {recents.map(renderPayee)}
            </>
          ) : null}
          {favorites.length === 0 && recents.length === 0 ? (
            <StateView preset="empty" compact title="No recent recipients" description="Search to find someone to pay." />
          ) : null}
        </View>
      ) : searching && results.length === 0 ? (
        <SkeletonList of="listItem" count={4} containerStyle={{ padding: theme.spacing.md }} />
      ) : results.length === 0 ? (
        <StateView
          preset="noResults"
          compact
          title="No one found"
          description={`We could not find anyone matching “${query}”.`}
          primaryAction={onAddNewPayee ? { label: 'Add as new payee', onPress: onAddNewPayee } : undefined}
          testID={childTestID(testID, 'no-results')}
        />
      ) : (
        <View>{results.map(renderPayee)}</View>
      )}
    </View>
  );
});

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  const theme = useAppTheme();
  return (
    <Text
      variant="labelMedium"
      accessibilityRole="header"
      style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, color: theme.colors.onSurfaceVariant }}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  quickRow: { flexDirection: 'row', alignItems: 'center' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
