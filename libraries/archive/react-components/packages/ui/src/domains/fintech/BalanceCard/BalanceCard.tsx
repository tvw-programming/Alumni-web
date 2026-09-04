import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';

import {
  formatMoney,
  moneyLabel,
  statusOf,
  timeLabel,
  useAction,
  type Money,
  type StatusMap,
} from '../../../foundation';

export type BalanceStatus = 'ready' | 'loading' | 'offline' | 'error' | 'locked';

export interface BalanceCardProps {
  accountName: string;
  balance: Money;
  availableBalance?: Money;
  visibility: 'masked' | 'visible';
  status: BalanceStatus;
  updatedAt?: string;
  onToggleVisibility: () => void;
  onPress?: () => void;
  onRefresh?: () => Promise<void>;
  /** Minutes before the balance re-masks itself. 0 disables it. */
  autoMaskAfterMinutes?: number;
}

const BALANCE_STATUS: StatusMap<BalanceStatus> = {
  ready: { label: 'Up to date', color: 'success' },
  loading: { label: 'Updating', color: 'default' },
  offline: { label: 'Offline — showing last known balance', color: 'warning' },
  error: { label: 'Could not update', color: 'error' },
  locked: { label: 'Account locked', color: 'error' },
};

const MASK = '••••••';

/**
 * An account balance, masked by default.
 *
 * Two React 19 decisions, and the second is the important one:
 *
 * - **Visibility** is a display preference. It is parent-controlled here, and
 *   `useOptimistic` would be reasonable if it were persisted server-side.
 * - **The balance itself is never optimistic.** Refresh is an Action whose
 *   result replaces the figure only when the server answers. A predicted
 *   balance is a wrong balance, and a wrong balance is the one number a banking
 *   app may not get wrong.
 *
 * The card re-masks itself when the tab is hidden and after an idle timeout,
 * because "shoulder surfing" is the actual threat model for a balance on a
 * phone in public.
 */
export function BalanceCard({
  accountName,
  balance,
  availableBalance,
  visibility,
  status,
  updatedAt,
  onToggleVisibility,
  onPress,
  onRefresh,
  autoMaskAfterMinutes = 2,
}: BalanceCardProps) {
  const masked = visibility === 'masked';
  const presentation = statusOf(BALANCE_STATUS, status);

  const [, refresh, refreshing] = useAction<void, 'refreshed'>(async () => {
    await onRefresh?.();
    return 'refreshed';
  });

  useEffect(() => {
    if (masked) return undefined;

    // Backgrounding the tab re-masks immediately: the phone may be handed over
    // or the screen photographed while the app is not in front.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') onToggleVisibility();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const timer =
      autoMaskAfterMinutes > 0
        ? window.setTimeout(onToggleVisibility, autoMaskAfterMinutes * 60_000)
        : undefined;

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [masked, autoMaskAfterMinutes, onToggleVisibility]);

  return (
    <Card variant="outlined" onClick={onPress} sx={{ cursor: onPress ? 'pointer' : 'default' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {accountName}
            </Typography>

            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
              // Bullets alone announce as "bullet bullet bullet". The label
              // says what is being hidden and why the user is seeing dots.
              aria-label={
                masked ? `Balance hidden for ${accountName}` : moneyLabel('Balance', balance)
              }
            >
              {masked ? MASK : formatMoney(balance)}
            </Typography>

            {availableBalance ? (
              <Typography
                variant="caption"
                color="text.secondary"
                aria-label={
                  masked
                    ? 'Available balance hidden'
                    : moneyLabel('Available balance', availableBalance)
                }
              >
                {masked ? `Available ${MASK}` : `Available ${formatMoney(availableBalance)}`}
              </Typography>
            ) : null}
          </Box>

          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              aria-label={masked ? 'Show balance' : 'Hide balance'}
              aria-pressed={!masked}
              onClick={(event) => {
                event.stopPropagation();
                onToggleVisibility();
              }}
            >
              {masked ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>

            {onRefresh ? (
              <IconButton
                size="small"
                aria-label="Refresh balance"
                disabled={refreshing || status === 'locked'}
                onClick={(event) => {
                  event.stopPropagation();
                  refresh();
                }}
              >
                {refreshing ? <CircularProgress size={18} /> : <RefreshIcon />}
              </IconButton>
            ) : null}
          </Stack>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 1.5 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Chip
            size="small"
            label={presentation.label}
            color={presentation.color}
            variant="outlined"
          />
          {updatedAt ? (
            <Typography variant="caption" color="text.secondary">
              {`Last updated ${timeLabel(updatedAt)}`}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
