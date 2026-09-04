import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import type { MediaAsset } from '../PostCard/PostCard';

export interface MediaGridViewerProps {
  media: MediaAsset[];
  /** Beyond this many, the last tile shows "+N". */
  maxTiles?: number;
}

/**
 * A media grid that opens into a lightbox.
 *
 * The alt text is shown **as a visible caption** in the lightbox, not only in
 * the `alt` attribute. Sighted users benefit from a description too, and making
 * it visible is what causes anyone to notice when it is missing or wrong.
 *
 * Arrow keys move between items and Escape closes — a lightbox without keyboard
 * navigation is a trap for anyone not using a mouse.
 */
export function MediaGridViewer({ media, maxTiles = 4 }: MediaGridViewerProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const visible = media.slice(0, maxTiles);
  const overflow = media.length - visible.length;

  useEffect(() => {
    if (openIndex === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight')
        setOpenIndex((current) => ((current ?? 0) + 1) % media.length);
      if (event.key === 'ArrowLeft')
        setOpenIndex((current) => ((current ?? 0) - 1 + media.length) % media.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [openIndex, media.length]);

  const active = openIndex === null ? null : media[openIndex];

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: visible.length === 1 ? '1fr' : '1fr 1fr',
          gap: 0.5,
        }}
      >
        {visible.map((asset, index) => {
          const isLast = index === visible.length - 1 && overflow > 0;
          return (
            <Box
              key={asset.id}
              component="button"
              type="button"
              onClick={() => {
                setOpenIndex(index);
              }}
              aria-label={
                isLast
                  ? `${asset.alt}, and ${String(overflow)} more`
                  : `${asset.alt}. Open in full screen`
              }
              sx={{
                position: 'relative',
                p: 0,
                border: 0,
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                bgcolor: 'action.hover',
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
              }}
            >
              <Box
                component="img"
                src={asset.uri}
                alt=""
                sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
              />
              {isLast ? (
                <Stack
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: 'common.white',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h6">{`+${String(overflow)}`}</Typography>
                </Stack>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Dialog
        open={active !== null}
        onClose={() => {
          setOpenIndex(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        {active ? (
          <Box sx={{ position: 'relative', bgcolor: 'common.black' }}>
            <IconButton
              aria-label="Close"
              onClick={() => {
                setOpenIndex(null);
              }}
              sx={{ position: 'absolute', top: 8, right: 8, color: 'common.white', zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>

            {media.length > 1 ? (
              <>
                <IconButton
                  aria-label="Previous"
                  onClick={() => {
                    setOpenIndex((current) => ((current ?? 0) - 1 + media.length) % media.length);
                  }}
                  sx={{ position: 'absolute', left: 8, top: '50%', color: 'common.white' }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  aria-label="Next"
                  onClick={() => {
                    setOpenIndex((current) => ((current ?? 0) + 1) % media.length);
                  }}
                  sx={{ position: 'absolute', right: 8, top: '50%', color: 'common.white' }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </>
            ) : null}

            <Box
              component="img"
              src={active.uri}
              alt={active.alt}
              sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
            />

            {/* The description, visible. Sighted users benefit too, and making
                it visible is what causes anyone to notice a missing one. */}
            <Stack sx={{ p: 2, color: 'common.white' }} spacing={0.5}>
              <Typography variant="body2">{active.alt}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }} role="status">
                {`${String((openIndex ?? 0) + 1)} of ${String(media.length)}`}
              </Typography>
            </Stack>
          </Box>
        ) : null}
      </Dialog>
    </>
  );
}
