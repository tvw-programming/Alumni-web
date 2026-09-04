import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { glassAccents } from '@/components/glass/glassAccents';
import { GlassCard } from '@/components/glass/GlassCard';
import { PageContainer } from '@/components/glass/PageContainer';

const pillars = [
  {
    title: 'Component reuse',
    body: 'A typed component library — cards, grids, editors and theme primitives shared across every page.',
    accent: glassAccents.violet,
  },
  {
    title: 'Clean routing',
    body: 'A public marketing shell and a protected admin console, each with its own chrome and error boundaries.',
    accent: glassAccents.teal,
  },
  {
    title: 'Reliable data',
    body: 'Query-cached fetching with optimistic and pessimistic update strategies and graceful error states.',
    accent: glassAccents.amber,
  },
];

/**
 * About page, ported from the CodeGen project and adapted to this app's
 * theme system — mission statement + pillar cards. The team moved to its own
 * page (/team).
 */
export function AboutPage() {
  return (
    <PageContainer
      title="About Idol-Promo"
      subtitle="A production-shaped reference app proving that maintainable code and a beautiful, modern aesthetic are not mutually exclusive."
    >
      <Grid container spacing={3} sx={{ mb: 5, alignItems: 'stretch' }}>
        {pillars.map((pillar) => (
          <Grid key={pillar.title} size={{ xs: 12, md: 4 }}>
            <GlassCard interactive accent={pillar.accent} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
                  {pillar.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pillar.body}
                </Typography>
              </CardContent>
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      <GlassCard sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          Our mission
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
          We build production-friendly interfaces with strong component reuse, clean routing and
          reliable data fetching — proving that maintainable code and a beautiful, modern aesthetic
          are not mutually exclusive.
        </Typography>
      </GlassCard>
    </PageContainer>
  );
}
