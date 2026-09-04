import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

export interface CarouselSlide {
  image: string;
  title: string;
  caption: string;
}

interface ImageCarouselProps {
  slides: CarouselSlide[];
  /** Auto-advance interval in ms; set 0 to disable. */
  interval?: number;
}

/**
 * Image carousel built entirely from Material UI primitives (Box, Fade,
 * IconButton), ported from the CodeGen project. Frame styling (border,
 * shadow, radius) comes from the active theme — glass tokens when a glass
 * style is on, plain divider/shadow otherwise — so it fits every theme
 * setting. Slide text is always white because it sits on a dark image scrim.
 */
export function ImageCarousel({ slides, interval = 5000 }: ImageCarouselProps) {
  const theme = useTheme();
  const { glass } = theme;
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (!interval) return;
    const id = setInterval(() => go(index + 1), interval);
    return () => clearInterval(id);
  }, [index, interval, go]);

  if (count === 0) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: 240, sm: 340, md: 420 },
        borderRadius: `${theme.shape.borderRadius}px`,
        overflow: 'hidden',
        border: `1px solid ${glass.enabled ? glass.border : theme.palette.divider}`,
        boxShadow: glass.enabled ? glass.shadow : theme.shadows[4],
      }}
    >
      {slides.map((slide, i) => (
        <Fade in={i === index} timeout={700} key={slide.title} unmountOnExit>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent 60%)',
              }}
            />
            <Box sx={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'common.white' }}>
                {slide.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                {slide.caption}
              </Typography>
            </Box>
          </Box>
        </Fade>
      ))}

      <CarouselButton side="left" label="Previous slide" onClick={() => go(index - 1)}>
        <ChevronLeftRoundedIcon />
      </CarouselButton>
      <CarouselButton side="right" label="Next slide" onClick={() => go(index + 1)}>
        <ChevronRightRoundedIcon />
      </CarouselButton>

      <Stack
        direction="row"
        spacing={1}
        sx={{ position: 'absolute', bottom: 12, width: '100%', justifyContent: 'center' }}
      >
        {slides.map((slide, i) => (
          <Box
            key={slide.title}
            onClick={() => setIndex(i)}
            sx={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              bgcolor: i === index ? 'primary.main' : 'rgba(255,255,255,0.5)',
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

function CarouselButton({
  side,
  label,
  onClick,
  children,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { glass } = theme;

  return (
    <IconButton
      onClick={onClick}
      aria-label={label}
      sx={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: 12,
        // Buttons always sit on the photo, so keep a dark scrim + white icon
        // regardless of theme; blur only when a glass style is active.
        color: 'common.white',
        bgcolor: alpha('#0f172a', 0.45),
        backdropFilter: glass.enabled ? `blur(${glass.blur}px)` : undefined,
        border: '1px solid rgba(255,255,255,0.35)',
        '&:hover': { bgcolor: alpha('#0f172a', 0.65) },
      }}
    >
      {children}
    </IconButton>
  );
}
