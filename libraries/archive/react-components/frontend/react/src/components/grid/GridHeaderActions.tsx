import ClearIcon from '@mui/icons-material/Clear';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export interface GridHeaderActionsProps {
  /** Grid title rendered as subtitle1/600 — same level as form titles, below the app-bar h6. */
  title: string;

  // ── Quick filter ──────────────────────────────────────────────────────────
  /**
   * Controlled quick-filter text. Supply both `quickFilter` and
   * `onQuickFilterChange` to enable the Global Search icon button.
   */
  quickFilter?: string;
  onQuickFilterChange?: (value: string) => void;
  /** Placeholder for the quick-filter text field. Default "Search across all columns…". */
  quickFilterPlaceholder?: string;

  // ── Fullscreen ────────────────────────────────────────────────────────────
  /**
   * Ref to the element that should enter fullscreen. Pass the ref that wraps
   * the grid (and the header) so the entire widget goes fullscreen together.
   * Omit to hide the Fullscreen button.
   */
  fullscreenTargetRef?: RefObject<HTMLElement | null>;

  // ── Extra buttons / actions (e.g. preference bar, reset) ─────────────────
  /**
   * Slot rendered to the right of the built-in icon buttons. Drop any
   * `ReactNode` here — preference bars, reset buttons, export actions, etc.
   */
  actions?: ReactNode;
}

/**
 * Reusable grid toolbar component. Drop it above any grid and supply only the
 * props you need — every feature is opt-in:
 *
 * - **Quick Filter**: pass `quickFilter` + `onQuickFilterChange` → 🔍 icon appears.
 *   Clicking it opens a compact Popper with an autofocused text field. Click
 *   outside or press Escape to close.
 * - **Fullscreen**: pass `fullscreenTargetRef` → ⛶ icon appears. Clicking it
 *   calls `requestFullscreen` on the target element; icon swaps to ⛶ Exit.
 *   Synced from the native `fullscreenchange` event so it works with F11 too.
 * - **Actions slot**: any ReactNode (preference bars, export buttons…) is
 *   rendered to the right of the built-in icons.
 *
 * @example
 * ```tsx
 * const wrapperRef = useRef<HTMLDivElement>(null);
 *
 * <div ref={wrapperRef}>
 *   <GridHeaderActions
 *     title="Users"
 *     quickFilter={quickFilter}
 *     onQuickFilterChange={setQuickFilter}
 *     fullscreenTargetRef={wrapperRef}
 *     actions={<UsersPreferencesContainer ... />}
 *   />
 *   <AppDataGrid ... />
 * </div>
 * ```
 */
export function GridHeaderActions({
  title,
  quickFilter,
  onQuickFilterChange,
  quickFilterPlaceholder = 'Search across all columns…',
  fullscreenTargetRef,
  actions,
}: GridHeaderActionsProps) {
  const quickFilterEnabled = quickFilter !== undefined && onQuickFilterChange !== undefined;
  const fullscreenEnabled = fullscreenTargetRef !== undefined;

  // ── Quick filter popper state ─────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  // The anchor lives in state, set by a callback ref, rather than in a ref
  // read during render. `anchorEl={ref.current}` is null on the render where
  // the button first mounts, so the Popper anchors to the viewport corner
  // instead of the button — and a ref write never triggers the re-render that
  // would correct it. This is MUI's documented anchorEl pattern.
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    // Autofocus after the popper mounts (next frame)
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') closeSearch();
    },
    [closeSearch],
  );

  // ── Fullscreen state ──────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreenEnabled) return;
    const handler = () => {
      setIsFullscreen(document.fullscreenElement != null);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [fullscreenEnabled]);

  const toggleFullscreen = useCallback(async () => {
    if (!fullscreenTargetRef?.current) return;
    if (isFullscreen) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await fullscreenTargetRef.current.requestFullscreen().catch(() => undefined);
    }
  }, [isFullscreen, fullscreenTargetRef]);

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      {/* Title */}
      <Typography variant="subtitle1" fontWeight={600} flexGrow={1} noWrap>
        {title}
      </Typography>

      {/* ── Built-in icon buttons ── */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        {/* Global Search button */}
        {quickFilterEnabled && (
          <>
            <Tooltip title={searchOpen ? 'Close search' : 'Global search'}>
              <IconButton
                ref={setSearchAnchorEl}
                size="small"
                aria-label="Global search"
                color={searchOpen || (quickFilter?.length ?? 0) > 0 ? 'primary' : 'default'}
                onClick={searchOpen ? closeSearch : openSearch}
                sx={{
                  border: 1,
                  borderColor:
                    searchOpen || (quickFilter?.length ?? 0) > 0 ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Popper
              open={searchOpen}
              anchorEl={searchAnchorEl}
              placement="bottom-end"
              transition
              disablePortal={false}
              modifiers={[
                { name: 'offset', options: { offset: [0, 6] } },
                { name: 'preventOverflow', options: { padding: 8 } },
              ]}
              style={{ zIndex: 1300 }}
            >
              {({ TransitionProps }) => (
                <Fade {...TransitionProps} timeout={160}>
                  <Box>
                    <ClickAwayListener onClickAway={closeSearch}>
                      <Paper
                        elevation={4}
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          minWidth: 280,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <TextField
                          inputRef={searchInputRef}
                          size="small"
                          fullWidth
                          placeholder={quickFilterPlaceholder}
                          value={quickFilter}
                          onChange={(e) => onQuickFilterChange(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon fontSize="small" color="action" />
                                </InputAdornment>
                              ),
                              endAdornment: (quickFilter?.length ?? 0) > 0 && (
                                <InputAdornment position="end">
                                  <IconButton
                                    size="small"
                                    edge="end"
                                    aria-label="Clear search"
                                    onClick={() => onQuickFilterChange('')}
                                    sx={{ p: 0.25 }}
                                  >
                                    <ClearIcon fontSize="small" />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                          }}
                        />
                      </Paper>
                    </ClickAwayListener>
                  </Box>
                </Fade>
              )}
            </Popper>
          </>
        )}

        {/* Fullscreen button */}
        {fullscreenEnabled && (
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton
              size="small"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              color={isFullscreen ? 'primary' : 'default'}

              onClick={toggleFullscreen}
              sx={{
                border: 1,
                borderColor: isFullscreen ? 'primary.main' : 'divider',
                borderRadius: 1.5,
              }}
            >
              {isFullscreen ? (
                <FullscreenExitIcon fontSize="small" />
              ) : (
                <FullscreenIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* ── Actions slot (preference bar, reset button, etc.) ── */}
      {actions && (
        <Stack direction="row" spacing={1} alignItems="center">
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
