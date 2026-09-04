import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth/auth-store';
import { AccentCard } from '../../shared/accent-card/accent-card';
import { GenericChart } from '../../shared/generic-chart/generic-chart';
import { PageContainer } from '../../shared/page-container/page-container';

import type { AccentName } from '../../shared/accent-card/accent-card';
import type { ChartSeries } from '../../shared/generic-chart/chart.types';

interface FeatureCard {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}

interface Kpi {
  readonly label: string;
  readonly value: string;
  readonly accent: AccentName;
}

const FEATURES: readonly FeatureCard[] = [
  {
    icon: 'insights',
    title: 'Analytics',
    body: 'Track the metrics that matter with live charts and KPI cards.',
  },
  {
    icon: 'groups',
    title: 'Collaboration',
    body: 'Shared workspaces with role-based, protected admin access.',
  },
  {
    icon: 'bolt',
    title: 'Automation',
    body: 'Reliable data fetching with caching and graceful error states.',
  },
];

const KPIS: readonly Kpi[] = [
  { label: 'Components', value: '40+', accent: 'violet' },
  { label: 'Signals only', value: '100%', accent: 'pink' },
  { label: 'Data grids', value: '5', accent: 'teal' },
  { label: 'Charts', value: 'Live', accent: 'amber' },
];

/** Weekly activity, matching the React landing page's demo series. */
const ACTIVITY: readonly ChartSeries[] = [
  {
    id: 'active-users',
    name: 'Active users',
    type: 'area',
    data: [32, 45, 41, 58, 63, 52, 71].map((y, index) => ({
      id: `au-${index}`,
      x: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
      y,
    })),
  },
  {
    id: 'sessions',
    name: 'Sessions',
    type: 'area',
    data: [21, 30, 28, 39, 44, 38, 52].map((y, index) => ({
      id: `s-${index}`,
      x: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
      y,
    })),
  },
];

/**
 * Public landing page.
 *
 * The React original leaned on `ScrollReveal` (framer-motion) and an image
 * carousel pulling from Unsplash. Both are dropped here: the animation library
 * has no place in a signals-only port, and the remote images made the page's
 * first paint depend on a third-party host.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccentCard,
    GenericChart,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    PageContainer,
    RouterLink,
  ],
  template: `
    <app-page-container
      title="Welcome to Idol-Promo"
      subtitle="A fully featured dashboard, rebuilt on Angular Signals."
    >
      <a page-action mat-flat-button [routerLink]="ctaLink()">
        {{ ctaLabel() }}
        <mat-icon iconPositionEnd>arrow_forward</mat-icon>
      </a>

      <h2 class="home__section">What you can build</h2>
      <div class="home__grid home__grid--three">
        @for (feature of features; track feature.title) {
          <app-accent-card interactive>
            <mat-card-content class="home__feature">
              <mat-icon class="home__feature-icon" aria-hidden="true">{{ feature.icon }}</mat-icon>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.body }}</p>
            </mat-card-content>
          </app-accent-card>
        }
      </div>

      <div class="home__highlight">
        <app-accent-card accent="violet">
          <mat-card-content class="home__highlight-card">
            <mat-icon class="home__feature-icon" aria-hidden="true">rocket_launch</mat-icon>
            <h3>{{ highlightTitle() }}</h3>
            <p>{{ highlightBody() }}</p>
            <a mat-flat-button [routerLink]="ctaLink()">
              {{ ctaLabel() }}
              <mat-icon iconPositionEnd>arrow_forward</mat-icon>
            </a>
          </mat-card-content>
        </app-accent-card>
        <div>
          <h2 class="home__section">A protected admin console, out of the box</h2>
          <p class="home__prose">
            Authentication, routing and error handling are already wired. Behind the login you get
            master-data management with editable AG Grid tables, schema-driven forms with
            validation, and cached data fetching built on <code>httpResource</code> — everything a
            back-office app needs from day one.
          </p>
        </div>
      </div>

      <h2 class="home__section">At a glance</h2>
      <div class="home__grid home__grid--four">
        @for (kpi of kpis; track kpi.label) {
          <app-accent-card interactive [accent]="kpi.accent">
            <mat-card-content>
              <p class="home__kpi-value">{{ kpi.value }}</p>
              <p class="home__kpi-label">{{ kpi.label }}</p>
            </mat-card-content>
          </app-accent-card>
        }
      </div>

      <app-accent-card>
        <mat-card-content>
          <h3 class="home__chart-title">Weekly activity</h3>
          <app-generic-chart
            [series]="activity"
            [height]="260"
            [xAxis]="{ categories: days }"
            ariaLabel="Weekly activity: active users and sessions"
          />
        </mat-card-content>
      </app-accent-card>
    </app-page-container>
  `,
  styles: `
    .home__section {
      margin: 40px 0 16px;
      font: var(--mat-sys-headline-small);
      font-weight: 600;
    }
    .home__section:first-of-type { margin-top: 0; }
    .home__grid {
      display: grid;
      gap: 24px;
      margin-bottom: 8px;
    }
    .home__grid--three { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .home__grid--four { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .home__feature, .home__highlight-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .home__feature h3, .home__highlight-card h3 {
      margin: 0;
      font: var(--mat-sys-title-medium);
      font-weight: 700;
    }
    .home__feature p, .home__highlight-card p {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .home__highlight-card a { margin-top: 8px; }
    .home__feature-icon {
      --mat-icon-color: var(--mat-sys-primary);
      width: 40px;
      height: 40px;
      font-size: 40px;
    }
    .home__highlight {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      align-items: center;
      gap: 32px;
      margin: 40px 0;
    }
    .home__prose {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .home__kpi-value {
      margin: 0;
      font: var(--mat-sys-headline-medium);
      font-weight: 700;
    }
    .home__kpi-label {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .home__chart-title {
      margin: 0 0 8px;
      font: var(--mat-sys-title-medium);
      font-weight: 600;
    }
  `,
})
export class HomePage {
  private readonly auth = inject(AuthStore);

  protected readonly features = FEATURES;
  protected readonly kpis = KPIS;
  protected readonly activity = ACTIVITY;
  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  protected readonly ctaLink = computed(() =>
    this.auth.isAuthenticated() ? '/admin/dashboard' : '/login',
  );
  protected readonly ctaLabel = computed(() =>
    this.auth.isAuthenticated() ? 'Go to admin' : 'Sign in',
  );
  protected readonly highlightTitle = computed(() =>
    this.auth.isAuthenticated() ? 'Welcome back!' : 'Get started — set up your project',
  );
  protected readonly highlightBody = computed(() =>
    this.auth.isAuthenticated()
      ? 'Your project is set up. Jump straight into the admin area.'
      : 'Sign in to configure your workspace and manage products, users and settings.',
  );
}
