import Card, { type CardProps } from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import { forwardRef } from 'react';

export interface GlassCardProps extends CardProps {
  /** Optional accent gradient overlay (e.g. an entry from glassAccents). */
  accent?: string;
  /** Enables the 3D hover lift used by the Home / Team cards. */
  interactive?: boolean;
}

/**
 * Reusable surface card, ported from the CodeGen project and adapted to this
 * app's theme system: instead of hardcoded glass tokens it reads
 * `theme.glass`, so it renders correctly in every theme style —
 * plain (solid Paper look), gradient glass, and 3D Gradient Glass — in both
 * light and dark mode. The base surface comes from the global MuiCard theme
 * overrides; this component only adds the accent overlay and 3D interaction.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { accent, interactive = false, sx, children, ...rest },
  ref,
) {
  const theme = useTheme();
  const { glass } = theme;

  const hoverShadow = glass.enabled
    ? glass.hoverShadow !== 'none'
      ? glass.hoverShadow
      : glass.shadow
    : theme.shadows[8];

  return (
    <Card
      ref={ref}
      elevation={0}
      sx={[
        {
          position: 'relative',
          overflow: 'hidden',
          // Accent gradients overlay the themed surface (glass or solid).
          ...(accent !== undefined && { backgroundImage: accent }),
          ...(interactive && {
            transformStyle: 'preserve-3d',
            transition: 'transform 220ms ease, box-shadow 220ms ease',
            '&:hover': {
              transform: 'translateY(-6px) rotateX(4deg) rotateY(-4deg)',
              boxShadow: hoverShadow,
            },
          }),
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- MUI's SxProps array branch narrows through any.
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Card>
  );
});
