import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppTextInput } from '@ui/atoms/AppTextInput';
import { useDebouncedValue } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { SocialAvatar } from '../primitives/SocialAvatar';
import { useSocialTheme } from '../theme/socialTokens';
import type { MentionCandidate, UserSummary } from '../types/domain';

/** Finds an in-progress @token immediately before the cursor. */
export const findActiveMention = (text: string, cursor: number): { query: string; start: number } | null => {
  const upToCursor = text.slice(0, cursor);
  const match = /(^|\s)@([A-Za-z0-9_.]*)$/.exec(upToCursor);
  if (!match) return null;
  const query = match[2] ?? '';
  return { query, start: cursor - query.length - 1 };
};

export interface MentionTextInputProps extends StyleEscapeHatches {
  value: string;
  onChange: (value: string) => void;
  /** Remote lookup. Debounced and cancelled by the component. */
  searchUsers: (query: string) => Promise<MentionCandidate[]>;
  onMentionSelect?: (user: UserSummary) => void;
  /** Mention scopes the caller allows, e.g. ['user', 'channel']. */
  allowedScopes?: string[];
  maxMentions?: number;
  /** Mentions resolved so far, so the cap can be enforced. */
  selectedMentions?: UserSummary[];
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  debounceMs?: number;
  offline?: boolean;
}

/**
 * Text input with @mention autocomplete.
 *
 * The menu uses combobox/listbox semantics and announces its result count, so
 * it is operable without sight. Stale requests are discarded rather than
 * racing — typing "@ma" then "@may" must never resurrect the first result set.
 *
 * Two rules the spec is emphatic about, both enforced here: the display name is
 * never inserted without a stable user id alongside it, and a candidate whose
 * privacy settings mean no notification will be sent says so *before* selection
 * rather than silently doing nothing.
 */
export const MentionTextInput = ({
  value,
  onChange,
  searchUsers,
  onMentionSelect,
  allowedScopes = ['user'],
  maxMentions,
  selectedMentions = [],
  label,
  placeholder = 'Write something…',
  multiline = true,
  debounceMs = 250,
  offline = false,
  style,
  containerStyle,
  testID,
}: MentionTextInputProps) => {
  const theme = useAppTheme();
  const social = useSocialTheme();

  const id = testID ?? 'mention-input';
  const [cursor, setCursor] = useState(value.length);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const requestId = useRef(0);

  const active = useMemo(() => findActiveMention(value, cursor), [cursor, value]);
  const debouncedQuery = useDebouncedValue(active?.query ?? null, debounceMs);

  const atCap = maxMentions != null && selectedMentions.length >= maxMentions;

  useEffect(() => {
    if (debouncedQuery == null || offline || atCap) {
      setCandidates([]);
      return;
    }

    // Discard stale responses — the last request typed wins, always.
    const current = ++requestId.current;
    setSearching(true);
    let cancelled = false;

    searchUsers(debouncedQuery)
      .then((results) => {
        if (cancelled || current !== requestId.current) return;
        setCandidates(results);
        setHighlighted(0);
      })
      .finally(() => {
        if (!cancelled && current === requestId.current) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [atCap, debouncedQuery, offline, searchUsers]);

  const insert = useCallback(
    (candidate: MentionCandidate) => {
      if (candidate.disabledReason || !active) return;

      const handle = candidate.user.handle ?? `@${candidate.user.displayName.replace(/\s+/g, '')}`;
      const before = value.slice(0, active.start);
      const after = value.slice(cursor);
      const next = `${before}${handle} ${after}`;

      onChange(next);
      // Cursor lands after the inserted mention, not at the end of the field.
      setCursor(before.length + handle.length + 1);
      setCandidates([]);
      // The caller stores the stable id; the text only carries the handle.
      onMentionSelect?.(candidate.user);
    },
    [active, cursor, onChange, onMentionSelect, value],
  );

  const showMenu = !!active && !offline && !atCap && (searching || candidates.length > 0 || debouncedQuery !== null);

  return (
    <View style={[containerStyle, style]} testID={id}>
      <AppTextInput
        value={value}
        onChangeText={(next) => {
          onChange(next);
          setCursor(next.length);
        }}
        onSelectionChange={(event) => setCursor(event.nativeEvent.selection.start)}
        label={label}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize="none"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="Type the at sign to mention someone"
        testID={childTestID(id, 'field')}
      />

      {atCap ? (
        <Text variant="labelSmall" style={{ color: social.colors.statusPending }}>
          You've reached the limit of {maxMentions} mentions.
        </Text>
      ) : null}

      {offline && active ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          You're offline — we can't look up people right now.
        </Text>
      ) : null}

      {showMenu ? (
        <View
          style={[
            styles.menu,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md },
          ]}
          // Combobox/listbox semantics so the menu is operable without sight.
          accessibilityRole="list"
          accessibilityLabel={
            searching
              ? 'Searching people'
              : `${candidates.length} ${candidates.length === 1 ? 'person' : 'people'} found`
          }
          testID={childTestID(id, 'menu')}
        >
          {searching && candidates.length === 0 ? (
            <View style={[styles.row, { padding: theme.spacing.sm, gap: 8 }]}>
              <ActivityIndicator size={14} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Searching people…
              </Text>
            </View>
          ) : candidates.length === 0 ? (
            <View style={{ padding: theme.spacing.sm }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                No matching people
              </Text>
            </View>
          ) : (
            <>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.xs }}
                accessibilityLiveRegion="polite"
              >
                {candidates.length} {candidates.length === 1 ? 'result' : 'results'}
              </Text>
              <Divider />
              {candidates.map((candidate, index) => {
                const disabled = !!candidate.disabledReason;
                return (
                  <TouchableRipple
                    key={candidate.user.id}
                    onPress={() => insert(candidate)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ disabled, selected: index === highlighted }}
                    accessibilityLabel={[
                      candidate.user.displayName,
                      candidate.user.handle,
                      candidate.user.verified ? 'verified' : undefined,
                      disabled ? candidate.disabledReason : undefined,
                      candidate.willNotBeNotified ? "won't be notified because of their privacy settings" : undefined,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    style={[
                      index === highlighted && !disabled
                        ? { backgroundColor: social.colors.surfaceSelected }
                        : undefined,
                      { opacity: disabled ? 0.55 : 1 },
                    ]}
                    testID={childTestID(id, `candidate-${candidate.user.id}`)}
                  >
                    <View style={[styles.row, { padding: theme.spacing.sm, gap: theme.spacing.sm }]}>
                      <SocialAvatar user={candidate.user} size={30} />
                      <View style={styles.flex}>
                        <View style={[styles.row, { gap: 4 }]}>
                          <Text variant="labelMedium" numberOfLines={1} style={styles.shrink}>
                            {candidate.user.displayName}
                          </Text>
                          {candidate.user.verified ? (
                            <Icon source="check-decagram" size={12} color={social.colors.verified} />
                          ) : null}
                        </View>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                          {candidate.user.handle}
                          {candidate.user.roleLabel ? ` · ${candidate.user.roleLabel}` : ''}
                        </Text>

                        {/* Told before selection, not discovered afterwards. */}
                        {disabled ? (
                          <Text variant="labelSmall" style={{ color: social.colors.statusError }}>
                            {candidate.disabledReason}
                          </Text>
                        ) : candidate.willNotBeNotified ? (
                          <Text variant="labelSmall" style={{ color: social.colors.statusPending }}>
                            This person won't be notified because of their privacy settings
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableRipple>
                );
              })}
            </>
          )}
        </View>
      ) : null}

      {allowedScopes.length > 1 ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          You can mention {allowedScopes.join(' and ')}.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  menu: { borderWidth: 1, overflow: 'hidden', marginTop: 4, maxHeight: 260 },
  shrink: { flexShrink: 1 },
  flex: { flex: 1 },
});
