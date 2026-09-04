import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { memo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { buildBreadcrumbs } from '@/routes/breadcrumbs';

/**
 * The breadcrumb trail for the current location.
 *
 * Renders nothing at the top of a hierarchy: a single crumb saying where you
 * already are is noise, and an empty `<nav>` is worse than no `<nav>`.
 *
 * The trail comes from `buildBreadcrumbs`, which reads the same nav arrays the
 * sidebars render — so this never carries its own copy of a page's label.
 */
export const AppBreadcrumbs = memo(function AppBreadcrumbs() {
  const location = useLocation();
  const crumbs = buildBreadcrumbs(location.pathname, location.search);

  if (crumbs.length < 2) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        aria-label="Breadcrumb"
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}
      >
        {crumbs.map((crumb, index) =>
          crumb.to === undefined ? (
            // The current page: text, not a link. `aria-current` is what tells a
            // screen reader which crumb it is standing on.
            <Typography
              key={`${crumb.label}-${String(index)}`}
              color="text.primary"
              variant="body2"
              fontWeight={600}
              aria-current="page"
            >
              {crumb.label}
            </Typography>
          ) : (
            <Link
              key={`${crumb.label}-${String(index)}`}
              component={RouterLink}
              to={crumb.to}
              underline="hover"
              color="inherit"
              variant="body2"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              {crumb.to === '/' && <HomeIcon fontSize="inherit" />}
              {crumb.label}
            </Link>
          ),
        )}
      </Breadcrumbs>
    </Box>
  );
});
