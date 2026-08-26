import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PaletteIcon from '@mui/icons-material/Palette';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { glassAccents } from '@/components/glass/glassAccents';
import { GlassCard } from '@/components/glass/GlassCard';
import { ImageCarousel, type CarouselSlide } from '@/components/glass/ImageCarousel';
import { PageContainer } from '@/components/glass/PageContainer';
import { ScrollReveal } from '@/components/motion/ScrollReveal';
import { useAuth } from '@/store/authContext';

/* ------------------------- content (CodeGen port) ------------------------ */

const slides: CarouselSlide[] = [
  {
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80',
    title: 'Insightful Dashboards',
    caption: 'Real-time data, beautifully rendered.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80',
    title: 'Built for Teams',
    caption: 'Collaborate with reusable, typed components.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80',
    title: 'Polished by Design',
    caption: 'A consistent glassmorphism aesthetic throughout.',
  },
];

const featureCards = [
  {
    image:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
    title: 'Analytics',
    body: 'Track the metrics that matter with live charts and KPI cards.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80',
    title: 'Collaboration',
    body: 'Shared workspaces with role-based, protected admin access.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    title: 'Automation',
    body: 'Reliable data fetching with caching and graceful error states.',
  },
];

const kpis = [
  { label: 'Components', value: '40+', accent: glassAccents.violet },
  { label: 'Theme styles', value: '3', accent: glassAccents.pink },
  { label: 'Data grids', value: '5', accent: glassAccents.teal },
  { label: 'Charts', value: 'Live', accent: glassAccents.amber },
];

/* ------------------------------- chart ---------------------------------- */

/** Theme-aware Highcharts options: transparent background, palette colors. */
function buildActivityOptions(theme: Theme): Highcharts.Options {
  const { text, divider, primary, secondary } = theme.palette;
  const axis = {
    labels: { style: { color: text.secondary } },
    lineColor: divider,
    tickColor: divider,
    gridLineColor: divider,
  } satisfies Highcharts.XAxisOptions & Highcharts.YAxisOptions;

  return {
    chart: {
      type: 'areaspline',
      backgroundColor: 'transparent',
      height: 260,
      style: { fontFamily: theme.typography.fontFamily },
    },
    title: { text: undefined },
    xAxis: { ...axis, categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    yAxis: { ...axis, title: { text: undefined } },
    legend: {
      itemStyle: { color: text.secondary },
      itemHoverStyle: { color: text.primary },
    },
    tooltip: {
      backgroundColor: theme.palette.background.paper,
      borderColor: divider,
      style: { color: text.primary },
    },
    plotOptions: {
      areaspline: { marker: { enabled: false }, fillOpacity: 0.25 },
    },
    series: [
      {
        type: 'areaspline',
        name: 'Active users',
        color: primary.main,
        data: [32, 45, 41, 58, 63, 52, 71],
      },
      {
        type: 'areaspline',
        name: 'Sessions',
        color: secondary.main,
        data: [21, 30, 28, 39, 44, 38, 52],
      },
    ],
    credits: { enabled: false },
  };
}

/* --------------------------- highlight card ------------------------------ */

interface HighlightCardProps {
  icon: ReactNode;
  title: string;
  body: string;
  buttonLabel: string;
  to: string;
}

/** The hero-style CTA card (icon + title + body + action button). */
function HighlightCard({ icon, title, body, buttonLabel, to }: HighlightCardProps) {
  return (
    <GlassCard sx={{ maxWidth: 520, width: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={2} alignItems="flex-start">
          {icon}
          <Typography variant="h5">{title}</Typography>
          <Typography color="text.secondary">{body}</Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            component={RouterLink}
            to={to}
          >
            {buttonLabel}
          </Button>
        </Stack>
      </CardContent>
    </GlassCard>
  );
}

/* -------------------------------- page ---------------------------------- */

/**
 * Public landing page, ported from the CodeGen project (carousel + feature
 * cards) and extended with themed KPI + chart glass cards. All surfaces
 * follow the active theme settings (plain / glass / 3D Gradient Glass).
 */
export function HomePage() {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const activityOptions = useMemo(() => buildActivityOptions(theme), [theme]);

  return (
    <PageContainer
      title="Welcome to Idol-Promo"
      subtitle="A fully featured dashboard with a polished, theme-aware aesthetic."
      action={
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          component={RouterLink}
          to={isAuthenticated ? '/admin/dashboard' : '/login'}
        >
          {isAuthenticated ? 'Go to Admin' : 'Sign in'}
        </Button>
      }
    >
      <ScrollReveal>
        <Box sx={{ mb: 5 }}>
          <ImageCarousel slides={slides} />
        </Box>
      </ScrollReveal>

      <ScrollReveal>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          What you can build
        </Typography>
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {featureCards.map((card) => (
            <Grid key={card.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <GlassCard interactive sx={{ height: '100%' }}>
                <CardMedia component="img" height="180" image={card.image} alt={card.title} />
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.body}
                  </Typography>
                </CardContent>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </ScrollReveal>

      {/* ── Alternating highlight rows: card ⇄ text ─────────────────────── */}
      <Grid container spacing={4} alignItems="center" sx={{ mb: 5 }}>
        {/* Row 1: card left, text right */}
        <Grid size={{ xs: 12, md: 6 }}>
          <ScrollReveal direction="left">
            <Box display="flex" justifyContent={{ xs: 'center', md: 'flex-start' }}>
              <HighlightCard
                icon={<RocketLaunchIcon color="primary" fontSize="large" />}
                title={isAuthenticated ? 'Welcome back!' : 'Get started — set up your project'}
                body={
                  isAuthenticated
                    ? 'Your project is set up. Jump straight into the admin area.'
                    : 'Sign in to configure your workspace and manage products, users, and settings.'
                }
                buttonLabel={isAuthenticated ? 'Go to Admin' : 'Set up your project'}
                to={isAuthenticated ? '/admin/dashboard' : '/login'}
              />
            </Box>
          </ScrollReveal>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ScrollReveal direction="right" delay={0.15}>
            <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
              A protected admin console, out of the box
            </Typography>
            <Typography color="text.secondary">
              Authentication, routing and error boundaries are already wired. Behind the login you
              get master-data management with editable AG Grid tables, quick-add forms with
              validation, and query-cached data fetching with optimistic or pessimistic saves —
              everything a back-office app needs from day one.
            </Typography>
          </ScrollReveal>
        </Grid>

        {/* Row 2: text left, card right (order swaps on md+) */}
        <Grid size={{ xs: 12, md: 6 }} order={{ xs: 2, md: 1 }}>
          <ScrollReveal direction="left" delay={0.15}>
            <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
              Three theme styles, one design system
            </Typography>
            <Typography color="text.secondary">
              Switch between Plain, Gradient Glass and 3D Gradient Glass, pick your own primary and
              secondary colors, and every surface — cards, grids, dialogs, charts — follows
              instantly. Preferences persist across sessions, in light and dark mode.
            </Typography>
          </ScrollReveal>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} order={{ xs: 1, md: 2 }}>
          <ScrollReveal direction="right">
            <Box display="flex" justifyContent={{ xs: 'center', md: 'flex-end' }}>
              <HighlightCard
                icon={<PaletteIcon color="secondary" fontSize="large" />}
                title="Make it yours"
                body="Explore the theme system — styles, colors and modes — and see the whole app restyle in real time."
                buttonLabel="Learn more"
                to="/about"
              />
            </Box>
          </ScrollReveal>
        </Grid>
      </Grid>

      <ScrollReveal>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          At a glance
        </Typography>
        <Grid container spacing={3}>
          {kpis.map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
              <GlassCard interactive accent={kpi.accent} sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {kpi.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {kpi.label}
                    </Typography>
                  </Stack>
                </CardContent>
              </GlassCard>
            </Grid>
          ))}

          <Grid size={{ xs: 12 }}>
            <GlassCard sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Weekly activity
              </Typography>
              <HighchartsReact highcharts={Highcharts} options={activityOptions} />
            </GlassCard>
          </Grid>
        </Grid>
      </ScrollReveal>
    </PageContainer>
  );
}
