import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
} from '@mui/material';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import TableRowsIcon from '@mui/icons-material/TableRows';
import RouteIcon from '@mui/icons-material/RouteOutlined';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import type { NewRunRequest, RunStep, StepAction } from '../types/workflow';
import { fonts, tokens } from '../theme';
import RunHeader from '../components/dashboard/RunHeader';
import StartRunDialog from '../components/dashboard/StartRunDialog';
import PhaseStepper from '../components/dashboard/PhaseStepper';
import RunSpine from '../components/dashboard/RunSpine';
import StepTaskPanel from '../components/dashboard/StepTaskPanel';
import { focusedStep } from '../hooks/useKeepStepInView';
import StepDialog from '../components/step/StepDialog';
import RevisionDialog from '../components/step/RevisionDialog';
import ArtifactsDialog from '../components/artifacts/ArtifactsDialog';
import RouteMap from '../components/visual/RouteMap';
import { awaitingDocument } from '../components/dashboard/ActionButtons';
import { fetchVisualVariants } from '../api/client';
import type { RevisionUpload } from '../api/client';
import type { VisualVariant } from '../data/visualVariants';
import { FALLBACK_VARIANTS } from '../data/visualVariants';
import type { DecisionOptions, useRun } from '../hooks/useRun';

// The data grid is ~400 kB and most readers stay on the spine, so it loads
// only when someone actually switches views.
const StepTable = lazy(() => import('../components/dashboard/StepTable'));

type View = 'spine' | 'table' | 'visual';
type Orientation = 'horizontal' | 'vertical';

interface Props {
  controller: ReturnType<typeof useRun>;
}

export default function DashboardPage({ controller }: Props) {
  const { run, loading, error, empty, act, rerunFrom, revise, clarify, start } = controller;
  // Visual is the default view: the route reads at a glance, and the spine and
  // table stay one click away.
  const [view, setView] = useState<View>('visual');
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  // The variants are the orchestrator's, from config.json. The built-in copy
  // stands in until the first fetch lands, and for good if it never does.
  const [variants, setVariants] = useState(FALLBACK_VARIANTS);
  const [selected, setSelected] = useState<RunStep | null>(null);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [revising, setRevising] = useState<RunStep | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; severity: 'success' | 'warning' } | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchVisualVariants().then((loaded) => {
      if (alive && Object.keys(loaded.variants).length > 0) setVariants(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  const visualVariant: VisualVariant =
    variants.variants[variants.default] ?? Object.values(variants.variants)[0] ?? FALLBACK_VARIANTS.variants.precision;

  const inspect = (step: RunStep) => setSelected(step);

  const handleAction = async (step: RunStep, action: StepAction, decision: DecisionOptions = {}) => {
    // Rerun means something different at a gate that has been rejected and
    // accepts a replacement: there is nothing to re-run, because the step that
    // wrote the document would write the same one. It asks for the document
    // instead. Intercepted here so the spine, the table and the route map all
    // behave the same way.
    if (action === 'rerun' && awaitingDocument(step)) {
      setSelected(null);
      setRevising(step);
      return;
    }
    try {
      // The gate declares which roles may decide it, so an unspecified role
      // defaults to one the gate actually accepts rather than to a fixed guess.
      // The dialog overrides this when the reviewer picks a different one.
      const message = await act(step.step, action, {
        ...decision,
        role: decision.role ?? step.requiredRoles?.[0],
      });
      setToast({ text: message, severity: 'success' });
      setSelected(null);
    } catch {
      /* the error surfaces through the controller */
    }
  };

  const handleRevision = async (upload: RevisionUpload) => {
    if (!revising) return;
    // Any failure propagates to the dialog, which is where the file is and
    // where the person who can fix it is looking.
    const { message, warnings } = await revise(revising.step, upload);
    setRevising(null);
    setToast({
      text: warnings.length > 0 ? `${message} ${warnings.join(' ')}` : message,
      severity: warnings.length > 0 ? 'warning' : 'success',
    });
  };

  const handleClarify = async (
    step: RunStep,
    answers: { id: string; answer: string }[],
    answeredBy: string,
  ) => {
    const message = await clarify(step.step, answers, answeredBy);
    setSelected(null);
    setToast({ text: message, severity: 'success' });
  };

  const handleStart = async (request: NewRunRequest) => {
    // Errors propagate to the dialog, which is where the form is.
    const message = await start(request);
    setStartOpen(false);
    setToast({ text: message, severity: 'success' });
  };

  const retryBlocked = async () => {
    if (!run) return;
    const target = run.blockedAt ?? run.steps.find((s) => s.status === 'FAILED')?.step;
    if (target === undefined) {
      setToast({ text: 'Nothing to retry — no step has failed.', severity: 'success' });
      return;
    }
    try {
      setToast({ text: await rerunFrom(target), severity: 'success' });
    } catch {
      /* the error surfaces through the controller */
    }
  };

  const startDialog = (
    <StartRunDialog
      open={startOpen}
      busy={loading}
      onClose={() => setStartOpen(false)}
      onStart={handleStart}
    />
  );

  if (!run) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh', px: 3 }}>
        <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 560 }}>
          {error ? (
            <Alert severity="error" variant="outlined" sx={{ maxWidth: 520 }}>
              {error}
            </Alert>
          ) : empty ? (
            // Not a fault: the pipeline does not start itself. This is what an
            // idle stack looks like, and the way out of it is right here.
            <>
              <Typography variant="h2">Nothing is running</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                The pipeline never starts on its own — no schedule, no trigger. A developer starts
                a run at step 01 and it stops at the BRD gate for a human decision.
              </Typography>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={() => setStartOpen(true)}
                sx={{
                  bgcolor: tokens.signal,
                  color: '#1A1400',
                  '&:hover': { bgcolor: tokens.signal, filter: 'brightness(1.1)' },
                }}
              >
                Start a run
              </Button>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: fonts.mono }}>
                or: codegen-core run DEEP-2042 --title "…" --criteria "AC-1 …"
              </Typography>
            </>
          ) : (
            <>
              <CircularProgress size={26} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Loading the run…
              </Typography>
            </>
          )}
        </Stack>
        {startDialog}
      </Box>
    );
  }

  const blocked = run.blockedAt === null ? null : run.steps.find((s) => s.step === run.blockedAt);
  // The step the run is on. Same helper the view-centring uses, so the row that
  // scrolls into view is the row showing its tasks.
  const currentStep = focusedStep(run.steps)?.step ?? null;

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 3.5 }, width: '100%' }}>
      <Stack spacing={3.5}>
        <RunHeader
          run={run}
          busy={loading}
          onRetryBlocked={retryBlocked}
          blockedStep={blocked ?? null}
          onStartRun={() => setStartOpen(true)}
          onJumpToGate={inspect}
          onOpenArtifacts={() => setArtifactsOpen(true)}
        />

        <PhaseStepper steps={run.steps} />

        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}

        <Box>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box>
              {view === 'visual' && (
                <Typography
                  sx={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: '.14em', color: visualVariant.palette.accent, mb: 0.5 }}
                >
                  {visualVariant.kicker}
                </Typography>
              )}
              <Tooltip title="Twenty-four steps in order. The two human gates break the sequence because they stop the run rather than sitting inside it. Select any step to inspect its input and output" arrow>
              <Typography variant="h3">
                {view === 'visual' ? visualVariant.headline : 'Execution sequence'}
              </Typography>
              </Tooltip>
            </Box>
            <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', flexShrink: 0 }}>
              {/* Orientation belongs to the Visual view alone, so it appears with it. */}
              {view === 'visual' && (
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={orientation}
                  onChange={(_, v: Orientation | null) => v && setOrientation(v)}
                  aria-label="Route orientation"
                >
                  <ToggleButton value="horizontal" aria-label="Horizontal route">
                    <LinearScaleIcon sx={{ fontSize: 16, mr: 0.75 }} /> Horizontal
                  </ToggleButton>
                  <ToggleButton value="vertical" aria-label="Vertical route">
                    <SwapVertIcon sx={{ fontSize: 16, mr: 0.75 }} /> Vertical
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
              <ToggleButtonGroup
                size="small"
                exclusive
                value={view}
                onChange={(_, v: View | null) => v && setView(v)}
                aria-label="Execution sequence view"
              >
                <ToggleButton value="visual" aria-label="Visual route view">
                  <RouteIcon sx={{ fontSize: 16, mr: 0.75 }} /> Visual
                </ToggleButton>
                <ToggleButton value="spine" aria-label="Spine view">
                  <ViewStreamIcon sx={{ fontSize: 16, mr: 0.75 }} /> Spine
                </ToggleButton>
                <ToggleButton value="table" aria-label="Table view">
                  <TableRowsIcon sx={{ fontSize: 16, mr: 0.75 }} /> Table
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          {view === 'spine' ? (
            <Card sx={{ px: { xs: 1.5, md: 2.5 }, py: 2, bgcolor: tokens.panel }}>
              <RunSpine
                steps={run.steps}
                edges={run.edges}
                busy={loading}
                onInspect={inspect}
                onAction={(s, a) => void handleAction(s, a)}
              />
            </Card>
          ) : view === 'visual' ? (
            <Card sx={{ px: { xs: 1.5, md: 2.5 }, py: 2, bgcolor: tokens.panel }}>
              <RouteMap
                steps={run.steps}
                edges={run.edges}
                variant={visualVariant}
                orientation={orientation}
                busy={loading}
                onInspect={inspect}
                onAction={(s, a) => void handleAction(s, a)}
              />
            </Card>
          ) : (
            <Suspense
              fallback={
                <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
                  <CircularProgress size={22} />
                </Box>
              }
            >
              <StepTable
                steps={run.steps}
                busy={loading}
                onInspect={inspect}
                onAction={(s, a) => void handleAction(s, a)}
              />
            </Suspense>
          )}

          {/* The route says where the run is; this says what it is doing there.
              A container of its own rather than more height on every card —
              see StepTaskPanel for why. */}
          <StepTaskPanel steps={run.steps} onInspect={inspect} />
        </Box>
      </Stack>

      {/* Dismissible three ways: the X in its header, the backdrop, and Escape —
          the last two come from Dialog's own onClose. */}
      <ArtifactsDialog run={run} open={artifactsOpen} onClose={() => setArtifactsOpen(false)} />

      {startDialog}

      <StepDialog
        step={selected}
        isCurrent={selected !== null && selected.step === currentStep}
        open={selected !== null}
        busy={loading}
        onClose={() => setSelected(null)}
        onAction={(s, a, d) => void handleAction(s, a, d)}
        onClarify={handleClarify}
      />

      {/* The way past a rejected gate. Opened by Rerun, from whichever view the
          reviewer happened to be in. */}
      <RevisionDialog
        step={revising}
        open={revising !== null}
        busy={loading}
        onClose={() => setRevising(null)}
        onSubmit={handleRevision}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={toast?.severity === 'warning' ? 9000 : 4500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          variant="outlined"
          onClose={() => setToast(null)}
          sx={{ bgcolor: tokens.panel }}
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
