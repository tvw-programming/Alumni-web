import Box from '@mui/material/Box';
import { useEffect, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Moves keyboard focus to the main content region whenever the route changes,
 * so screen-reader / keyboard users land on the new page's content rather than
 * staying on a now-stale nav link.
 */
// eslint-disable-next-line react-refresh/only-export-components -- This hook and its companion component form one accessibility utility.
export function useFocusMainOnRouteChange(mainRef: RefObject<HTMLElement | null>): void {
  const location = useLocation();
  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname, mainRef]);
}

/**
 * Visually-hidden "skip to content" link that becomes visible on keyboard focus.
 * Targets the shell's main region by id.
 */
export function SkipToContentLink({ targetId }: { targetId: string }) {
  return (
    <Box
      component="a"
      href={`#${targetId}`}
      sx={{
        position: 'absolute',
        left: 8,
        top: -48,
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        px: 2,
        py: 1,
        borderRadius: 1,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        textDecoration: 'none',
        transition: 'top 120ms ease-in',
        '&:focus': { top: 8 },
      }}
    >
      Skip to content
    </Box>
  );
}
