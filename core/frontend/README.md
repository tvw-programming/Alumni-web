# CodeGen Core — Run Monitor

A workflow monitoring dashboard for the CodeGen Core 24-stage pipeline. React 19 +
TypeScript + Material&nbsp;UI, built with Vite.

Watch a run move through 24 steps, open any step to read the exact data it
received and produced, and approve, reject or restart work at the points where
a human decision is required.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then a production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Types only, no build |
| `npm run smoke` | Renders every route server-side and asserts the mock data holds |

## What you are looking at

**The run spine** is the main view. Twenty-four steps in strict order, each
numbered, each showing its status, model, duration and cost. The two human gates
are drawn as full-width bars that break the rail rather than as another node,
because that is what they are — the run stops there and configuration cannot
remove them. Active remediation loops appear as labelled back-edges on the step
that triggered them.

Switch to **table view** for the same steps in a sortable, filterable grid when
you want to scan rather than read.

**Selecting any step** opens an inspector with four tabs: the input it received,
the output it produced, the artifacts it wrote with their checksums, and its
provenance — which backend, which model, how many tokens, what it cost. Input
and output render in a collapsible JSON viewer coloured by type.

**Approve, Reject and Rerun** appear wherever they apply: on the gate bars, in
the inspector, in the table, and in the global action bar. Controls that do not
apply are shown disabled with a tooltip explaining why, so the absence of an
option is never a mystery.

**The Documentation tab** is a two-column reader: a searchable tree of every
markdown file on the left, the rendered document on the right with syntax
highlighting, styled tables and typographic hierarchy.

## Refresh

The run polls every 60 seconds. The ring in the top bar counts down to the next
refresh, so it is something you can see coming rather than a surprise repaint.
Pause it, or refresh immediately, from the same control. Taking an action
resets the countdown.

The interval lives in `src/hooks/useRun.ts` as `REFRESH_INTERVAL_MS`.

## Project structure

```
src/
├── api/mockApi.ts           Mock transport — swap for fetch to go live
├── components/
│   ├── dashboard/           Run header, phase stepper, spine, table, chips, actions
│   ├── docs/                Tree sidebar, markdown renderer
│   ├── layout/              Top bar, refresh countdown
│   └── step/                Inspection dialog, JSON viewer
├── data/
│   ├── steps.ts             The 24 step definitions
│   ├── payloads.ts          Input/output per step
│   ├── run.ts               Run state assembly
│   └── docs.ts              Documentation tree
├── docs/*.md                Markdown source, imported with ?raw
├── hooks/useRun.ts          Polling, countdown, actions
├── pages/                   Dashboard, Documentation
├── types/workflow.ts        Domain types
└── theme.ts                 Design tokens and MUI theme
```

## Running against a real backend

Out of the box the dashboard runs on a built-in mock, so it works immediately
after `npm install` with no backend at all. To point it at a live pipeline:

```bash
# 1. In core/backend — produce a run and serve it
cd ../backend
pip install -e ".[monitor]"
codegen-core run DEEP-1042
codegen-core-monitor                # http://127.0.0.1:8000

# 2. Here
cd ../frontend
cp .env.example .env                # then uncomment VITE_API_BASE
npm run dev
```

`src/api/client.ts` picks the transport: set `VITE_API_BASE` and it uses
`httpApi.ts`, leave it unset and it uses `mockApi.ts`. Both expose identical
signatures, so nothing else in the app changes.

| Variable | Effect |
|---|---|
| `VITE_API_BASE` | Orchestrator base URL. Unset means mock mode. |
| `VITE_JOB_ID` | Pin one run. Defaults to the newest on the server. |

### What the server sends

The backend reconstructs every field from the run journal and the artifact
index — it keeps no separate store for the dashboard. That has a useful
consequence: the UI cannot show a reviewer anything an auditor could not
reconstruct from the same files.

| Endpoint | Purpose |
|---|---|
| `GET /api/runs` | Every run on disk, newest first |
| `GET /api/runs/{job}` | The full run, in the shape `types/workflow.ts` describes |
| `GET /api/runs/{job}/steps/{n}` | One step in detail |
| `GET /api/runs/{job}/artifacts/{file}` | An artifact, scoped to the job's own directory |
| `GET /api/runs/{job}/journal` | The append-only audit record |
| `POST /api/runs/{job}/steps/{n}/decision` | Approve or reject a gate |
| `POST /api/runs/{job}/steps/{n}/rerun` | Queue a step to run again |

Two behaviours worth knowing. A decision recorded here appears immediately with
`awaitingExecution: true`, because the orchestrator only appends it to the
journal when the runner next reaches that gate — a reviewer should never be
asked to approve something they already approved. And role checks are enforced
server-side: a wrong role gets a 403, so the UI's disabled buttons are a
courtesy rather than the control.

## Design notes

The palette treats the app as an instrument panel. Amber is the primary accent
because the product's premise is that two human decisions are structurally
required — the colour that means "a person must act" is the one that carries the
identity. Teal, rose and periwinkle carry success, failure and live work.

Space Grotesk sets the interface; JetBrains Mono carries step numbers, job ids,
checksums and JSON, where tabular figures and unambiguous glyphs matter. Step
numbering is mono and zero-padded because 01→24 is a real sequence, not
decoration.

Motion is limited to two things that encode state: the refresh countdown, and a
pulse on whatever is currently running. `prefers-reduced-motion` disables both.

## Notes

- Bundles are split so the dashboard does not pay for the documentation
  renderer or the data grid; both load on demand.
- The syntax highlighter registers only the languages these docs use, which
  takes it from roughly 700 kB to 40 kB.
- Keyboard focus is visible throughout, and the spine nodes are reachable and
  operable by keyboard.
