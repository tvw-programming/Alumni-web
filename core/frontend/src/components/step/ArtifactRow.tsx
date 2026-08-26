import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Artifact } from '../../types/workflow';
import { fonts, tokens } from '../../theme';

/** Human-readable size. The index records bytes; nobody reads bytes. */
export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Which artifact to open first.
 *
 * A step that writes a document writes the readable source and the rendered
 * copy of it; the reviewer wants the readable one. Documents therefore outrank
 * the PDF, which is a rendering of what they are already reading.
 */
export function defaultArtifact(artifacts: Artifact[]): string | null {
  const order = ['md', 'diff', 'json'];
  // A replaced document is still listed, but it is never what opens first:
  // the reader wants what the run currently holds.
  const live = artifacts.filter((a) => !a.superseded);
  const pool = live.length > 0 ? live : artifacts;
  for (const ext of order) {
    const match = pool.find((a) => a.ext.toLowerCase() === ext);
    if (match) return match.file;
  }
  return pool[0]?.file ?? null;
}

interface Props {
  artifact: Artifact;
  active: boolean;
  onSelect: () => void;
  /** Prefix for lists that span steps, where the filename alone is not enough. */
  context?: string;
}

/**
 * One selectable artifact.
 *
 * The row is a real <button>, so it takes keyboard focus and announces its
 * pressed state — the artifact list is a picker, not decoration.
 */
export default function ArtifactRow({ artifact, active, onSelect, context }: Props) {
  return (
    <Stack
      component="button"
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        cursor: 'pointer',
        border: `1px solid ${active ? alpha(tokens.signal, 0.5) : tokens.rule}`,
        bgcolor: active ? alpha(tokens.signal, 0.07) : 'transparent',
        borderRadius: 1,
        px: 1.5,
        py: 1.25,
        '&:hover': { bgcolor: active ? alpha(tokens.signal, 0.1) : tokens.panelRaised },
        '&:focus-visible': { outline: `1px solid ${tokens.signal}`, outlineOffset: 1 },
      }}
    >
      {/* Spans throughout: this row is a <button>, whose content model does not
          allow block elements. */}
      <Box component="span" sx={{ display: 'block', minWidth: 0 }}>
        {context && (
          <Typography
            component="span"
            variant="caption"
            sx={{ display: 'block', color: tokens.faint, fontFamily: fonts.mono }}
          >
            {context}
          </Typography>
        )}
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontFamily: fonts.mono,
            fontSize: 12.5,
            color: active ? tokens.signal : artifact.superseded ? tokens.faint : 'text.primary',
            textDecoration: artifact.superseded ? 'line-through' : 'none',
          }}
          noWrap
        >
          {artifact.file}
        </Typography>
        <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {artifact.outputClass} · {bytes(artifact.bytes)} · sha256 {artifact.sha256}
          {artifact.source === 'human_upload' ? ' · uploaded by a reviewer' : ''}
        </Typography>
      </Box>
      <Stack component="span" direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
        {/* Replaced, not deleted: still readable for the audit trail, but never
            mistakable for the document the run is working from. */}
        {artifact.superseded && (
          <Chip
            component="span"
            size="small"
            label="superseded"
            sx={{
              bgcolor: alpha(tokens.fail, 0.1),
              color: tokens.fail,
              border: `1px solid ${alpha(tokens.fail, 0.35)}`,
            }}
          />
        )}
        <Chip
          component="span"
          size="small"
          label={`.${artifact.ext}`}
          sx={{ bgcolor: tokens.panelRaised, border: `1px solid ${tokens.rule}` }}
        />
      </Stack>
    </Stack>
  );
}
