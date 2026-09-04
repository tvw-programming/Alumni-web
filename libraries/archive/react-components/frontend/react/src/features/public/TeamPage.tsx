import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { glassAccents, type GlassAccent } from '@/components/glass/glassAccents';
import { GlassCard } from '@/components/glass/GlassCard';
import { PageContainer } from '@/components/glass/PageContainer';
import { ItemsAccordion } from '@/components/ItemsAccordion';

interface TeamCard {
  name: string;
  role: string;
  blurb: string;
  accent: GlassAccent;
  initials: string;
}

const team: TeamCard[] = [
  {
    name: 'Engineering',
    role: 'Platform & Frontend',
    blurb: 'Owns the component library, routing and the typed data layer.',
    accent: 'violet',
    initials: 'EN',
  },
  {
    name: 'Design',
    role: 'Product & Brand',
    blurb: 'Defines the glassmorphism language and accessibility standards.',
    accent: 'pink',
    initials: 'DS',
  },
  {
    name: 'Data',
    role: 'Analytics & ML',
    blurb: 'Builds the pipelines powering dashboards and live metrics.',
    accent: 'teal',
    initials: 'DA',
  },
  {
    name: 'Operations',
    role: 'Reliability',
    blurb: 'Keeps releases smooth with monitoring and incident response.',
    accent: 'amber',
    initials: 'OP',
  },
];

/**
 * Team page, ported from the CodeGen project's About team section: accent
 * gradient cards with a 3D hover lift, rendered through the theme-aware
 * GlassCard so every theme style (plain / glass / 3D Gradient Glass) works.
 */
export function TeamPage() {
  return (
    <PageContainer
      title="Meet the team"
      subtitle="A small, cross-functional team building a polished, reusable dashboard."
    >
      <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
        {team.map((member) => (
          <Grid key={member.name} size={{ xs: 12, sm: 6, md: 3 }}>
            <GlassCard
              interactive
              accent={glassAccents[member.accent]}
              sx={{ height: '100%', perspective: 800 }}
            >
              <CardContent>
                <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
                  <Avatar
                    sx={(theme) => ({
                      width: 56,
                      height: 56,
                      fontWeight: 700,
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(15,23,42,0.25)',
                      color: theme.palette.text.primary,
                    })}
                  >
                    {member.initials}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {member.name}
                    </Typography>
                    <Typography variant="overline" color="text.secondary">
                      {member.role}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {member.blurb}
                  </Typography>
                </Stack>
              </CardContent>
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Live from the API
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fetched from the dockerized Go Fiber service (see docker-compose.yaml) — expand a panel to
          confirm the round trip.
        </Typography>
        <ItemsAccordion />
      </Box>
    </PageContainer>
  );
}
