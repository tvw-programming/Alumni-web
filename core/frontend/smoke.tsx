import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './src/App';
import theme from './src/theme';
import DocsPage from './src/pages/DocsPage';
import StepTable from './src/components/dashboard/StepTable';
import StepDialog from './src/components/step/StepDialog';
import RevisionDialog, { documentLabel } from './src/components/step/RevisionDialog';
import ArtifactRow from './src/components/step/ArtifactRow';
import ActionButtons, { availableActions } from './src/components/dashboard/ActionButtons';
import ArtifactsDialog, { artifactCount } from './src/components/artifacts/ArtifactsDialog';
import RunHeader from './src/components/dashboard/RunHeader';
import StartRunDialog from './src/components/dashboard/StartRunDialog';
import RouteMap from './src/components/visual/RouteMap';
import TruckCard from './src/components/visual/TruckCard';
import DashboardPage from './src/pages/DashboardPage';
import { LOGISTICS_VARIANT } from './src/data/visualVariants';
import { buildRun } from './src/data/run';
import { docsById } from './src/data/docs';
import { mockArtifactText } from './src/data/artifactText';

function render(path: string, node: React.ReactNode, override = theme) {
  return renderToString(
    <ThemeProvider theme={override}>
      <CssBaseline />
      <StaticRouter location={path}>{node}</StaticRouter>
    </ThemeProvider>,
  );
}

/**
 * A dialog lives in a portal, which renders to nothing on the server — so a
 * plain SSR check of one passes while proving nothing about its contents.
 * Disabling the portal puts the dialog body inline where it can be asserted on.
 */
const inlineDialogs = createTheme(theme, {
  components: { MuiModal: { defaultProps: { disablePortal: true, keepMounted: true } } },
});

/**
 * The BRD gate as it stands after a rejection: waiting for a document rather
 * than for a decision. This is the state the whole replacement path exists for.
 */
function rejectedGate() {
  const gate = buildRun().steps.find((s) => s.step === 6)!;
  return {
    ...gate,
    status: 'REJECTED' as const,
    revision: { ...gate.revision!, required: true },
  };
}

/** Render, then insist the markup actually contains what the check is about. */
function renderContaining(node: React.ReactNode, expected: string[]): string {
  const html = render('/', node, inlineDialogs);
  const missing = expected.filter((text) => !html.includes(text));
  if (missing.length > 0) {
    throw new Error(`rendered, but without: ${missing.join(', ')}`);
  }
  return html;
}

const checks: [string, () => string][] = [
  ['dashboard', () => render('/', <App />)],
  [
    'docs:concepts',
    () => render('/docs/01-concepts', <Routes><Route path="/docs/:slug" element={<DocsPage />} /></Routes>),
  ],
  [
    'docs:steps-reference',
    () => render('/docs/05-steps-reference', <Routes><Route path="/docs/:slug" element={<DocsPage />} /></Routes>),
  ],
  [
    'docs:adr',
    () => render('/docs/adr-0001', <Routes><Route path="/docs/:slug" element={<DocsPage />} /></Routes>),
  ],
  [
    // The new getting-started guide, reachable from the Documentation tab.
    // Cross-references to other docs use plain backtick filenames rather than
    // markdown links, because a relative `.md` href doesn't resolve inside
    // this SPA — this check would fail loudly if that regressed.
    'docs:running-and-configuring',
    () => {
      const html = render(
        '/docs/10-running-and-configuring',
        <Routes><Route path="/docs/:slug" element={<DocsPage />} /></Routes>,
      );
      // SSR serialises text content, so the heading's ampersand arrives
      // HTML-escaped rather than literal — same gotcha as the route titles.
      const expected = ['Running &amp; Configuring', 'plugins.tracker', 'routing.defaults.reasoning', '06-safety-model.md'];
      const missing = expected.filter((text) => !html.includes(text));
      if (missing.length > 0) throw new Error(`rendered, but without: ${missing.join(', ')}`);
      if (html.includes('href="06-safety-model.md"')) {
        throw new Error('a cross-doc reference rendered as a broken relative link');
      }
      return html;
    },
  ],
  [
    'step table',
    () =>
      render(
        '/',
        <StepTable steps={buildRun().steps} onInspect={() => {}} onAction={() => {}} />,
      ),
  ],
  [
    // Step 05 writes the BRD as .md plus a rendered .pdf, so this is the dialog
    // state the artifact viewer exists for.
    // A step dialog opens on Input, so this covers the shell rather than the
    // artifact tab; the gate check below covers the artifact list and viewer.
    'step dialog: BRD step',
    () => {
      const brd = buildRun().steps.find((s) => s.step === 5)!;
      return renderContaining(
        <StepDialog step={brd} open onClose={() => {}} onAction={() => {}} />,
        ['BRD generation', 'Artifacts (2)'],
      );
    },
  ],
  [
    // An open gate opens on the document under review, and offers the decision
    // controls. Artifact bodies load in an effect, so only the shell is asserted.
    'step dialog: open gate',
    () => {
      const gate = buildRun().steps.find((s) => s.step === 6)!;
      const awaiting = { ...gate, status: 'AWAITING_APPROVAL' as const };
      return renderContaining(
        <StepDialog step={awaiting} open onClose={() => {}} onAction={() => {}} />,
        [
          'Under review at this gate',
          '05_brd__DEEP-1042-9d3a7c__v1.md',
          'text/markdown',
          'Deciding as',
          'product_owner',
        ],
      );
    },
  ],
  [
    // The counter sits in the metrics row between Tokens and Blocking findings,
    // and is a real button so it takes focus and announces the dialog it opens.
    'run header: artifacts tile opens a dialog',
    () => {
      const run = buildRun();
      const html = renderContaining(
        <RunHeader
          run={run}
          blockedStep={null}
          onRetryBlocked={() => {}}
          onStartRun={() => {}}
          onJumpToGate={() => {}}
          onOpenArtifacts={() => {}}
        />,
        ['Artifacts', String(artifactCount(run)), 'aria-haspopup="dialog"'],
      );
      const order = ['Tokens', 'Artifacts', 'Blocking findings'].map((label) => html.indexOf(label));
      if (order.some((p, i) => i > 0 && p < order[i - 1])) {
        throw new Error('the Artifacts tile is not between Tokens and Blocking findings');
      }
      return html;
    },
  ],
  [
    // The run-wide popup: every step that wrote something, in pipeline order,
    // with the first artifact open in the reader.
    'artifacts dialog: stepwise list',
    () => {
      const run = buildRun();
      const html = renderContaining(<ArtifactsDialog run={run} open onClose={() => {}} />, [
        'Jira story extraction',
        'BRD generation',
        '01_jira_story__DEEP-1042-9d3a7c__v1.json',
        '05_brd__DEEP-1042-9d3a7c__v1.pdf',
        'Close artifacts',
      ]);

      // Every artifact in the run must be listed, or the count lies.
      const listed = run.steps.flatMap((s) => s.artifacts).filter((a) => html.includes(a.file));
      if (listed.length !== artifactCount(run)) {
        throw new Error(`listed ${listed.length} of ${artifactCount(run)} artifacts`);
      }

      // And the steps must appear in pipeline order, not registry or map order.
      const positions = run.steps
        .filter((s) => s.artifacts.length > 0)
        .map((s) => html.indexOf(s.artifacts[0].file));
      if (positions.some((p, i) => i > 0 && p < positions[i - 1])) {
        throw new Error('steps are out of order in the list');
      }
      return html;
    },
  ],
  [
    // The Visual view: the same steps as the spine, drawn as a freight route.
    'visual route: horizontal',
    () => {
      const run = buildRun();
      const html = renderContaining(
        <RouteMap
          steps={run.steps}
          edges={run.edges}
          variant={LOGISTICS_VARIANT}
          orientation="horizontal"
          onInspect={() => {}}
          onAction={() => {}}
        />,
        // The scrollbar is styled rather than left to the platform: twenty-four
        // cards is a long drag, and a macOS overlay bar fades out mid-aim.
        ['FREIGHT ROUTE', 'Jira story extraction', 'Human input', '24 CLEARED', '-webkit-scrollbar'],
      );

      // One truck per step, or the route is not the run. Titles carrying an
      // ampersand arrive HTML-escaped inside the aria-label.
      const drawn = run.steps.filter((step) =>
        html.includes(`Step ${step.step}: ${step.title.replaceAll('&', '&amp;')}`),
      );
      if (drawn.length !== run.steps.length) {
        throw new Error(`drew ${drawn.length} of ${run.steps.length} steps`);
      }
      return html;
    },
  ],
  [
    // A pending step holds no input, output or artifacts, so it is inert: no
    // role="button", not in the tab order, and announced as disabled.
    'visual route: pending steps are inert',
    () => {
      const run = buildRun();
      const pending = run.steps.find((s) => s.status === 'PENDING')!;
      const html = renderContaining(
        <TruckCard
          step={pending}
          variant={LOGISTICS_VARIANT}
          orientation="horizontal"
          onInspect={() => {}}
          onAction={() => {}}
        />,
        ['aria-disabled="true"', 'nothing to inspect'],
      );
      if (html.includes('role="button"') || html.includes('tabindex="0"')) {
        throw new Error('a pending step is still reachable as a control');
      }

      // While a step that has run stays a control.
      const done = run.steps.find((s) => s.status === 'SUCCESS')!;
      const live = renderContaining(
        <TruckCard
          step={done}
          variant={LOGISTICS_VARIANT}
          orientation="horizontal"
          onInspect={() => {}}
          onAction={() => {}}
        />,
        ['role="button"', 'tabindex="0"'],
      );
      return html + live;
    },
  ],
  [
    // Horizontal puts the decision controls under the step icon; vertical puts
    // them beside it. Both keep their accessible names.
    'visual route: gate controls follow the orientation',
    () => {
      const gate = { ...buildRun().steps.find((s) => s.step === 6)!, status: 'AWAITING_APPROVAL' as const };
      const across = renderContaining(
        <TruckCard
          step={gate}
          variant={LOGISTICS_VARIANT}
          orientation="horizontal"
          onInspect={() => {}}
          onAction={() => {}}
        />,
        // Emotion serialises without spaces; the column is the icon-over-buttons
        // stack that puts the controls under the icon.
        ['aria-label="Approve"', 'aria-label="Reject"', 'flex-direction:column'],
      );
      const down = renderContaining(
        <TruckCard
          step={gate}
          variant={LOGISTICS_VARIANT}
          orientation="vertical"
          onInspect={() => {}}
          onAction={() => {}}
        />,
        ['Approve', 'Reject'],
      );
      return across + down;
    },
  ],
  [
    // The whole point of the rejection path: once a gate stands rejected, the
    // decision pair is gone and Rerun is the only way forward.
    'rejected gate: Rerun replaces the decision controls',
    () => {
      const rejected = rejectedGate();
      // The controls the spine and the route map draw: enabled ones only.
      const html = renderContaining(
        <ActionButtons step={rejected} onAction={() => {}} />,
        ['Rerun', 'Upload a replacement document'],
      );
      if (html.includes('>Approve<') || html.includes('>Reject<')) {
        throw new Error('a rejected gate still offers a decision');
      }
      // And the shared rule they all read agrees.
      const actions = availableActions(rejected);
      if (actions.approve.enabled || actions.reject.enabled || !actions.rerun.enabled) {
        throw new Error('availableActions still offers a decision at a rejected gate');
      }
      return html;
    },
  ],
  [
    // And the dialog says why, rather than leaving a reviewer hunting for the
    // Approve button that used to be there.
    'rejected gate: the dialog explains the replacement path',
    () =>
      renderContaining(
        <StepDialog step={rejectedGate()} open onClose={() => {}} onAction={() => {}} />,
        [
          'This gate is waiting for a replacement document',
          'Rerun opens the upload',
          '0 of 3 replacements used',
        ],
      ),
  ],
  [
    // The upload itself: accepted formats, the artifact being replaced, and the
    // name and role that go into the audit record.
    'revision dialog: names what it replaces and who is replacing it',
    () =>
      renderContaining(
        <RevisionDialog step={rejectedGate()} open onClose={() => {}} onSubmit={async () => {}} />,
        // Interpolated text is split by SSR comment markers, so the assertions
        // stop at the boundaries rather than spanning them.
        [
          'Upload an updated',
          documentLabel(rejectedGate()),
          '05_brd__DEEP-1042-9d3a7c__v1.md',
          '.md, .pdf, .docx',
          'Uploading as',
          'Replace and re-open gate',
        ],
      ),
  ],
  [
    // A replaced document stays readable and stays visibly replaced.
    'artifact row: a superseded document is marked as such',
    () => {
      const artifact = { ...buildRun().steps[4].artifacts[0], superseded: true };
      return renderContaining(
        <ArtifactRow artifact={artifact} active={false} onSelect={() => {}} />,
        ['superseded', 'line-through'],
      );
    },
  ],
  [
    // A failed step blocks the run, so the header names it and offers the one
    // control that clears it.
    'blocked run: the header names the step and offers Retry',
    () => {
      const run = buildRun();
      const blocked = run.steps.find((s) => s.step === run.blockedAt)!;
      return renderContaining(
        <RunHeader
          run={run}
          blockedStep={blocked}
          onRetryBlocked={() => {}}
          onStartRun={() => {}}
          onJumpToGate={() => {}}
          onOpenArtifacts={() => {}}
        />,
        ['Blocked at step', '18', 'Retry step', 'Start a run'],
      );
    },
  ],
  [
    // Retry belongs to failed steps alone. Re-running a step that succeeded
    // would spend tokens reproducing a document that is already correct.
    'retry is offered on a failed step and nowhere else',
    () => {
      const run = buildRun();
      const failed = run.steps.find((s) => s.status === 'FAILED')!;
      const done = run.steps.find((s) => s.status === 'SUCCESS')!;
      if (!availableActions(failed).retry.enabled) {
        throw new Error('a failed step offers no Retry');
      }
      if (availableActions(done).retry.enabled) {
        throw new Error('a successful step still offers Retry');
      }
      return renderContaining(
        <ActionButtons step={failed} onAction={() => {}} />,
        ['Retry', 'Run this step again from the beginning'],
      );
    },
  ],
  [
    // Nothing starts a run but a person, and the form asks for exactly what
    // step 01 would otherwise fetch.
    'start dialog: asks for the story step 01 needs',
    () =>
      renderContaining(
        <StartRunDialog open onClose={() => {}} onStart={async () => {}} />,
        [
          'Start a run',
          'Jira story number',
          'Story title',
          'Acceptance criteria',
          'fetch the story from the configured tracker',
          'Start at step 01',
        ],
      ),
  ],
  [
    // Visual is the default view, and its button leads the group.
    'dashboard opens on the visual route',
    () => {
      // Built from the mock run rather than peekRun: the smoke build inherits
      // VITE_API_BASE from compose, which switches the mock transport off.
      const controller = {
        run: buildRun(),
        loading: false,
        error: null,
        secondsUntilRefresh: 600,
        autoRefresh: true,
        setAutoRefresh: () => {},
        refresh: async () => {},
        act: async () => '',
        rerunFrom: async () => '',
      };
      const html = renderContaining(<DashboardPage controller={controller} />, [
        'Every release arrives on time',
        'FREIGHT ROUTE',
        'Route orientation',
      ]);

      const order = ['Visual route view', 'Spine view', 'Table view'].map((label) =>
        html.indexOf(label),
      );
      if (order.some((p, i) => p < 0 || (i > 0 && p < order[i - 1]))) {
        throw new Error('the view buttons are not in Visual, Spine, Table order');
      }
      return html;
    },
  ],
  [
    'visual route: vertical',
    () => {
      const run = buildRun();
      return renderContaining(
        <RouteMap
          steps={run.steps}
          edges={run.edges}
          variant={LOGISTICS_VARIANT}
          orientation="vertical"
          onInspect={() => {}}
          onAction={() => {}}
        />,
        ['STATION 01', 'STATION 24'],
      );
    },
  ],
];

let failed = 0;
for (const [name, fn] of checks) {
  try {
    const html = fn();
    console.log(`  PASS  ${name.padEnd(22)} ${html.length.toLocaleString()} chars`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Data assertions: the mock run must actually contain what the UI promises.
const run = buildRun();
const assertions: [string, boolean][] = [
  ['24 steps present', run.steps.length === 24],
  ['two gates', run.steps.filter((s) => s.kind === 'GATE').length === 2],
  ['gates are 06 and 24', run.steps.filter((s) => s.kind === 'GATE').map((s) => s.step).join() === '6,24'],
  ['every step has a rationale', run.steps.every((s) => s.rationale.length > 40)],
  ['every step has a category', run.steps.every((s) => s.category.length > 0)],
  // Eight, not nine: a rejected BRD gate declares no edge, because re-running
  // step 05 on the same inputs writes the same document. It is answered with a
  // replacement document instead — see the gate's `revision`.
  ['8 remediation edges', run.edges.length === 8],
  ['no edge leaves the BRD gate', !run.edges.some((e) => e.from === 6)],
  ['every edge has a loop budget', run.edges.every((e) => e.maxLoops >= 1)],
  // The architecture doc counts 13 agents plus 2 hybrids (19 pairs a scanner
  // with a triage agent; 24 pairs a gate with the merge plugin). Here each step
  // carries one primary kind, so the pure agent count is 15.
  ['15 agents / 1 tool / 6 plugins / 2 gates', (() => {
    const by = (k: string) => run.steps.filter((s) => s.kind === k).length;
    return by('AGENT') === 15 && by('TOOL') === 1 && by('PLUGIN') === 6 && by('GATE') === 2;
  })()],
  ['13 docs registered', docsById.size === 13],
  ['every doc has content', [...docsById.values()].every((d) => (d.content ?? '').length > 200)],
  ['steps 1-18 have input payloads', run.steps.slice(0, 18).every((s) => s.input !== null)],
  ['cost is non-zero', run.costUsd > 0],
  // The viewer can only show what the transport can read. Live mode reads the
  // files; the mock has to carry a body for every text artifact it advertises.
  [
    'every text artifact has a body',
    run.steps
      .flatMap((s) => s.artifacts)
      .filter((a) => a.ext === 'md' || a.ext === 'json')
      .every((a) => (mockArtifactText(a.file) ?? '').length > 100),
  ],
  ['binary artifacts report no body', mockArtifactText(`05_brd__DEEP-1042-9d3a7c__v1.pdf`) === null],
  // The variant is the orchestrator's; this copy only stands in for it.
  ['logistics variant carries its headline', LOGISTICS_VARIANT.headline === 'Every release arrives on time'],
  // The dashboard sends a role with every decision and takes it from here. An
  // empty list would leave it inventing one, which is how gate 06 came to be
  // approved as a role it does not accept.
  [
    'every gate declares who may decide it',
    run.steps.filter((s) => s.kind === 'GATE').every((s) => (s.requiredRoles ?? []).length > 0),
  ],
  [
    'the gate under review carries the document',
    (run.steps.find((s) => s.step === 6)?.reviewArtifacts ?? []).some((a) => a.ext === 'md'),
  ],
];

for (const [name, ok] of assertions) {
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

console.log(failed === 0 ? '\nall checks passed' : `\n${failed} check(s) failed`);
if (failed > 0) process.exit(1);
