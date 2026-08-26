import HomeIcon from '@mui/icons-material/Home';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/store/authContext';
import { logWarning } from '@/utils/errorLogger';

/**
 * Shown when an authenticated user reaches a route their role does not permit.
 *
 * Distinct from the 404 view on purpose: "this exists but is not yours" is
 * different information from "this does not exist", and conflating them makes
 * a permissions problem look like a broken link.
 */
export function ForbiddenPage() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? null;

  // A denial is worth recording: a legitimate user hitting this repeatedly
  // usually means their role is wrong, not that they are probing.
  useEffect(() => {
    logWarning({
      channel: 'app',
      fileName: 'ForbiddenPage.tsx',
      error: 'ACCESS_DENIED',
      errorDescription: `Role "${user?.role ?? 'none'}" was denied ${from ?? 'a protected route'}.`,
      context: { kind: 'authorization', attempted: from, role: user?.role ?? null },
    });
  }, [from, user?.role]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" px={2}>
      <Stack spacing={2} alignItems="center" textAlign="center" sx={{ maxWidth: 560 }}>
        <LockPersonIcon color="warning" sx={{ fontSize: 56 }} aria-hidden="true" />
        <Typography variant="h4">Not permitted</Typography>
        <Typography color="text.secondary">
          {from
            ? `Your account does not have access to ${from}.`
            : 'Your account does not have access to that page.'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as <strong>{user?.displayName ?? 'unknown'}</strong> with the{' '}
          <strong>{user?.role ?? 'unknown'}</strong> role. Ask an administrator if you need wider
          access.
        </Typography>
        <Button
          component={RouterLink}
          to="/admin/dashboard"
          variant="contained"
          startIcon={<HomeIcon />}
        >
          Back to dashboard
        </Button>
      </Stack>
    </Box>
  );
}
