import {
  ComponentDemo,
  DomainIcon,
  DomainSurface,
  DomainThemeProvider,
  hasGlassTokens,
  needsDomainSurface,
  type DomainAppearance,
} from '@idol-ui/react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';
import { parseMarkdown } from '@/features/admin/documentation/markdown';
import { MarkdownView } from '@/features/admin/documentation/MarkdownView';

import { useDomainAppearance } from './domainAppearanceStore';
import {
  componentsOf,
  domainsOf,
  useComponentPayload,
  useDomainCatalogue,
} from './useDomainCatalogue';

type DetailTab = 'preview' | 'sample' | 'usage' | 'source' | 'docs';

/** Shown when a component folder has no `usage.tsx` to demo. */
const missingDemo = <Alert severity="warning">This component has no usage demo yet.</Alert>;

/**
 * One component from the shared library: live demo, sample data, wiring, source
 * and documentation.
 *
 * **This page holds no navigation.** The domain tree is in the Master Data
 * sidebar (`DomainComponentTree`), so there is one tree in the app rather than
 * two competing ones — and the page is a detail view, which is what the URL
 * already says it is.
 *
 * Which component to show comes from `?component=`, so the sidebar, this page
 * and a shared link cannot disagree.
 */
export function DomainComponentsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<DetailTab>('preview');
  /*
   * Both glass appearances degrade to `plain` when the app theme carries no
   * glass tokens — the library's documented fallback. Left unsaid, the two
   * buttons just look broken: you press them and nothing happens. So the picker
   * reads the same theme the resolver does and says why instead.
   */
  const theme = useTheme();
  const glassAvailable = hasGlassTokens(theme);
  const glassHint = glassAvailable
    ? undefined
    : 'Needs the app style set to gradient glass or 3D gradient glass — Manage Theme.';

  const catalogue = useDomainCatalogue();
  const components = componentsOf(catalogue.data);
  const domainCount = domainsOf(catalogue.data).length;

  const requested = searchParams.get('component');
  // Fall back to the first component rather than an empty pane, and ignore a
  // stale `?component=` that no longer exists.
  const selectedId =
    requested !== null && components.some((entry) => entry.id === requested)
      ? requested
      : (components[0]?.id ?? null);

  const selected = components.find((entry) => entry.id === selectedId);
  /*
   * The appearance belongs to the *domain*, not to this page and not to the
   * selected component: choosing "3D glass" while looking at one cart component
   * is a statement about E-commerce, so it holds for the other nine and is
   * still there tomorrow.
   */
  const { appearance, isExplicit, setAppearance, reset } = useDomainAppearance(selected?.domainId);
  const domainLabel =
    domainsOf(catalogue.data).find((domain) => domain.id === selected?.domainId)?.label ??
    selected?.domainId ??
    '';
  /*
   * Each tab fetches its own text, and only once opened. `enabled` keeps the
   * other three idle rather than pulling four files to show one.
   */
  const readmeText = useComponentPayload(tab === 'docs' ? selectedId : null, 'README.md');
  const sourceText = useComponentPayload(tab === 'source' ? selectedId : null, 'source.txt');
  const usageText = useComponentPayload(tab === 'usage' ? selectedId : null, 'usage.txt');
  const sampleText = useComponentPayload(tab === 'sample' ? selectedId : null, 'sample.json');

  const readme = useMemo(
    () => (readmeText.data === undefined ? null : parseMarkdown(readmeText.data)),
    [readmeText.data],
  );

  if (!selected) {
    if (catalogue.isPending) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (catalogue.isError) {
      return (
        <Alert severity="error">
          The component catalogue could not be loaded. Run <code>pnpm dev</code> or{' '}
          <code>pnpm build</code> — both regenerate it from <code>packages/ui/src/domains</code>.
        </Alert>
      );
    }
    return (
      <Alert severity="info">
        No components in the catalogue yet. Add a folder under{' '}
        <code>src/shared/domains/&lt;domain&gt;/&lt;Component&gt;/</code> and it appears here.
      </Alert>
    );
  }

  return (
    <Stack spacing={2} sx={{ height: { md: '100%' }, minHeight: 0, pb: 2 }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5">{selected.name}</Typography>
          {/* The same icon the sidebar branch uses, so the two agree at a glance. */}
          <Chip
            size="small"
            variant="outlined"
            icon={<DomainIcon domain={selected.domainId} />}
            label={domainLabel}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {selected.summary}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {`Pick another from the sidebar — ${String(components.length)} components across ${String(domainCount)} domains.`}
        </Typography>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          flexGrow: { md: 1 },
          minHeight: { xs: 400, md: 0 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 2, pt: 1.5, flexWrap: 'wrap' }}
        >
          {/*
            Named after the domain, because that is the scope of the change.
            "Appearance" alone reads as a setting for the component on screen,
            which is the one thing it is not.
          */}
          <Typography variant="caption" color="text.secondary">
            {`Appearance · ${domainLabel}`}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={appearance}
            aria-label="Domain appearance"
            onChange={(_event, next: DomainAppearance | null) => {
              if (next) setAppearance(next);
            }}
          >
            <ToggleButton value="inherit">Inherit</ToggleButton>
            <ToggleButton value="plain">Plain</ToggleButton>
            <Tooltip title={glassHint ?? ''} disableHoverListener={glassAvailable}>
              {/* A span, so the tooltip still fires while the button is disabled. */}
              <span>
                <ToggleButton value="gradientGlass" disabled={!glassAvailable}>
                  Gradient glass
                </ToggleButton>
              </span>
            </Tooltip>
            <Tooltip title={glassHint ?? ''} disableHoverListener={glassAvailable}>
              <span>
                <ToggleButton value="glass3d" disabled={!glassAvailable}>
                  3D glass
                </ToggleButton>
              </span>
            </Tooltip>
            <ToggleButton value="mesh">Image</ToggleButton>
            <ToggleButton value="animated">Image, animated</ToggleButton>
          </ToggleButtonGroup>

          {/*
            Only offered once there is something to undo. A permanently visible
            "Reset" on a setting that is already the default is a control that
            does nothing, and the reader has to press it to find that out.
          */}
          {isExplicit ? (
            <Button size="small" onClick={reset}>
              Reset
            </Button>
          ) : null}

          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {isExplicit ? 'Saved for this domain' : 'Default'}
          </Typography>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_event, next: DetailTab) => {
            setTab(next);
          }}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="preview" label="Preview" />
          <Tab value="sample" label="Sample JSON" />
          <Tab value="usage" label="Usage" />
          <Tab value="source" label="Source" />
          <Tab value="docs" label="Docs" />
        </Tabs>

        <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', p: 3 }}>
          {tab === 'preview' ? (
            // A demo is other people's code by the time this page renders it:
            // an error boundary keeps one broken component from taking the
            // gallery down with it. Keyed by id so switching components
            // remounts rather than reusing a crashed boundary.
            <AppErrorBoundary key={selected.id}>
              <Suspense
                fallback={
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                  </Box>
                }
              >
                {/*
                  One provider around the demo gives every surface inside it the
                  domain treatment — no component is edited, and the boundary is
                  `display: contents` so it changes no layout.
                */}
                <DomainThemeProvider domain={selected.domainId} appearance={appearance}>
                  <Box sx={{ maxWidth: 720 }}>
                    {/*
                      A third of the library renders a Stack or a Box at its
                      root, which the scoped selectors cannot match. Those get an
                      explicit surface to paint; the rest already render a Card,
                      and wrapping those too would tint a box around an
                      already-tinted card.

                      The registry decides, not this page — the same classifier
                      the coverage test asserts against, so the two cannot
                      disagree about which components are covered.
                    */}
                    {needsDomainSurface(selected.surfaceTier) ? (
                      <DomainSurface>
                        <ComponentDemo id={selected.id} fallback={missingDemo} />
                      </DomainSurface>
                    ) : (
                      <ComponentDemo id={selected.id} fallback={missingDemo} />
                    )}
                  </Box>
                </DomainThemeProvider>
              </Suspense>
            </AppErrorBoundary>
          ) : null}

          {tab === 'sample' ? <PayloadView query={sampleText} language="json" /> : null}
          {tab === 'usage' ? <PayloadView query={usageText} language="tsx" /> : null}
          {tab === 'source' ? <PayloadView query={sourceText} language="tsx" /> : null}
          {tab === 'docs' ? (
            readmeText.isPending ? (
              <PayloadSpinner />
            ) : readme ? (
              <MarkdownView doc={readme} />
            ) : (
              <Alert severity="info">This component has no README yet.</Alert>
            )
          ) : null}
        </Box>
      </Paper>
    </Stack>
  );
}

function PayloadSpinner() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

/**
 * A text payload fetched from `public/domain-components/`.
 *
 * The three states are spelled out rather than collapsed into "render whatever
 * arrived": a file that 404s because the catalogue was not regenerated should
 * say so, not render an empty code block that looks like an empty component.
 */
function PayloadView({
  query,
  language,
}: {
  query: { data?: string; isPending: boolean; isError: boolean };
  language: string;
}) {
  if (query.isPending) return <PayloadSpinner />;
  if (query.isError || query.data === undefined) {
    return (
      <Alert severity="error">
        That file could not be loaded. Run <code>pnpm dev</code> or <code>pnpm build</code> to
        regenerate the catalogue.
      </Alert>
    );
  }
  return <CodeBlock text={query.data} language={language} />;
}

/** Read-only source view. Scrolls inside itself so the page never scrolls sideways. */
function CodeBlock({ text, language }: { text: string; language: string }) {
  return (
    <Box
      component="pre"
      aria-label={`${language} source`}
      tabIndex={0}
      sx={{
        m: 0,
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
        fontSize: 13,
        lineHeight: 1.6,
        overflowX: 'auto',
      }}
    >
      <code>{text}</code>
    </Box>
  );
}
