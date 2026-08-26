import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import type { Artifact, Run, RunStep } from '../../types/workflow';
import { fonts, statusMeta, tokens } from '../../theme';
import ArtifactRow, { defaultArtifact } from '../step/ArtifactRow';
import ArtifactView from '../step/ArtifactView';

/**
 * Every artifact in the run, in the order the pipeline wrote them.
 *
 * The step dialog answers "what did this step produce"; this answers "what does
 * the run consist of", which is the question someone asks when they want to read
 * the output rather than audit a step. Grouping by step keeps the sequence — an
 * artifact means little without knowing which stage stands behind it.
 */

interface StepGroup {
  step: RunStep;
  artifacts: Artifact[];
}

/** Steps that wrote something, in pipeline order. */
function groupByStep(run: Run | null): StepGroup[] {
  if (!run) return [];
  return [...run.steps]
    .sort((a, b) => a.step - b.step)
    .filter((step) => step.artifacts.length > 0)
    .map((step) => ({ step, artifacts: step.artifacts }));
}

export function artifactCount(run: Run | null): number {
  return run ? run.steps.reduce((n, s) => n + s.artifacts.length, 0) : 0;
}

interface Props {
  run: Run | null;
  open: boolean;
  onClose: () => void;
}

export default function ArtifactsDialog({ run, open, onClose }: Props) {
  const groups = useMemo(() => groupByStep(run), [run]);
  const flat = useMemo(() => groups.flatMap((g) => g.artifacts), [groups]);
  const [openFile, setOpenFile] = useState<string | null>(null);

  // Opening the dialog starts at the top of the run rather than wherever the
  // previous visit left off.
  useEffect(() => {
    if (open) setOpenFile(null);
  }, [open]);

  // Derived, so a refresh that replaces the artifact objects cannot strand the
  // selection on a filename the run no longer has.
  const chosen = openFile && flat.some((a) => a.file === openFile) ? openFile : defaultArtifact(flat);
  const shown = flat.find((a) => a.file === chosen) ?? null;
  const shownStep = groups.find((g) => g.artifacts.some((a) => a.file === chosen))?.step ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      scroll="paper"
      aria-labelledby="artifacts-dialog-title"
      slotProps={{
        paper: { sx: { bgcolor: tokens.panel, width: '100%', maxWidth: 'none', m: 2, height: '94vh' } },
      }}
    >
      <DialogTitle id="artifacts-dialog-title" sx={{ p: 0 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            px: 3,
            py: 2,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${tokens.rule}`,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.25} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h2" sx={{ color: 'text.primary' }}>
                Artifacts
              </Typography>
              <Chip
                size="small"
                label={flat.length}
                sx={{
                  bgcolor: alpha(tokens.signal, 0.12),
                  color: tokens.signal,
                  border: `1px solid ${alpha(tokens.signal, 0.4)}`,
                  fontFamily: fonts.mono,
                }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Everything this run has written, in the order the pipeline produced it.
              {run && ` Job ${run.jobId}.`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close artifacts">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', minHeight: 0 }}>
        {flat.length === 0 ? (
          <Box sx={{ display: 'grid', placeItems: 'center', width: '100%', p: 6 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              This run has not written any artifacts yet.
            </Typography>
          </Box>
        ) : (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{ width: '100%', minHeight: 0, alignItems: 'stretch' }}
          >
            {/* The sequence: one section per step that wrote something. */}
            <Box
              component="ol"
              aria-label="Artifacts by step"
              sx={{
                listStyle: 'none',
                m: 0,
                p: 2,
                width: { xs: '100%', md: 460 },
                flexShrink: 0,
                overflowY: 'auto',
                borderRight: { md: `1px solid ${tokens.rule}` },
                borderBottom: { xs: `1px solid ${tokens.rule}`, md: 'none' },
                maxHeight: { xs: '38vh', md: 'none' },
              }}
            >
              {groups.map(({ step, artifacts }, index) => (
                <Box component="li" key={step.step} sx={{ mb: index === groups.length - 1 ? 0 : 2.5 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', mb: 1, position: 'sticky', top: -16, bgcolor: tokens.panel, py: 0.5, zIndex: 1 }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        fontWeight: 600,
                        color: statusMeta[step.status].color,
                        border: `1px solid ${alpha(statusMeta[step.status].color, 0.4)}`,
                        borderRadius: 0.75,
                        px: 0.6,
                        py: 0.1,
                        flexShrink: 0,
                      }}
                    >
                      {String(step.step).padStart(2, '0')}
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'text.primary', minWidth: 0 }} noWrap>
                      {step.title}
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {artifacts.map((a) => (
                      <ArtifactRow
                        key={a.file}
                        artifact={a}
                        active={a.file === chosen}
                        onSelect={() => setOpenFile(a.file)}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>

            {/* The reader: whichever artifact is selected on the left. */}
            <Box sx={{ flex: 1, minWidth: 0, p: 2, overflowY: 'auto' }}>
              {shown && (
                <Stack spacing={1.5}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {shownStep
                      ? `Step ${String(shownStep.step).padStart(2, '0')} · ${shownStep.title} · ${shownStep.category}`
                      : shown.file}
                  </Typography>
                  <ArtifactView key={shown.file} artifact={shown} />
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
