import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '@/store/authContext';

const APP_NAME = 'Idol-Promo';
const CONTACT_EMAIL = 'hello@react-admin-starter.dev';

const FOOTER_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Use', to: '/terms' },
] as const;

/** Public-site footer, pinned to the bottom via the layout's flex column. */
export function PublicFooter() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();
  const adminTo = isAuthenticated ? '/admin/dashboard' : '/login';

  return (
    <Box
      component="footer"
      sx={{ mt: 'auto', borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 3, md: 4 }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6">{APP_NAME}</Typography>
            <Typography variant="body2" color="text.secondary">
              © {year} {APP_NAME}. All rights reserved.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Version {__APP_VERSION__}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Links
            </Typography>
            <Stack spacing={0.5}>
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  color="text.secondary"
                  underline="hover"
                  variant="body2"
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Get in touch
            </Typography>
            <Stack spacing={0.5}>
              <Link
                href={`mailto:${CONTACT_EMAIL}`}
                color="text.secondary"
                underline="hover"
                variant="body2"
              >
                {CONTACT_EMAIL}
              </Link>
              <Link
                component={RouterLink}
                to={adminTo}
                color="primary"
                underline="hover"
                variant="body2"
                fontWeight={600}
              >
                Admin
              </Link>
            </Stack>
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Built with React, React Router, and MUI.
        </Typography>
      </Container>
    </Box>
  );
}
