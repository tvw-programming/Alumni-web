import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { AccentCard } from '../../shared/accent-card/accent-card';
import { PageContainer } from '../../shared/page-container/page-container';

import type { AccentName } from '../../shared/accent-card/accent-card';

interface Pillar {
  readonly title: string;
  readonly body: string;
  readonly accent: AccentName;
}

const PILLARS: readonly Pillar[] = [
  {
    title: 'Component reuse',
    body: 'A typed component library — cards, grids, editors and theme primitives shared across every page.',
    accent: 'violet',
  },
  {
    title: 'Clean routing',
    body: 'A public marketing shell and a guarded admin console, each with its own chrome and error handling.',
    accent: 'teal',
  },
  {
    title: 'Reliable data',
    body: 'Cached fetching over httpResource, with explicit invalidation and graceful error states.',
    accent: 'amber',
  },
];

/** About page: mission statement and the three pillars, ported from React. */
@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccentCard, MatCardModule, PageContainer],
  template: `
    <app-page-container
      title="About Idol-Promo"
      subtitle="A production-shaped reference app proving that maintainable code and a polished, modern aesthetic are not mutually exclusive."
    >
      <div class="about__grid">
        @for (pillar of pillars; track pillar.title) {
          <app-accent-card interactive [accent]="pillar.accent">
            <mat-card-content>
              <h2 class="about__pillar-title">{{ pillar.title }}</h2>
              <p class="about__body">{{ pillar.body }}</p>
            </mat-card-content>
          </app-accent-card>
        }
      </div>

      <app-accent-card>
        <mat-card-content class="about__mission">
          <h2 class="about__mission-title">Our mission</h2>
          <p class="about__body">
            We build production-friendly interfaces with strong component reuse, clean routing and
            reliable data fetching — proving that maintainable code and a beautiful, modern
            aesthetic are not mutually exclusive.
          </p>
        </mat-card-content>
      </app-accent-card>
    </app-page-container>
  `,
  styles: `
    .about__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    .about__pillar-title {
      margin: 0 0 8px;
      font: var(--mat-sys-title-medium);
      font-weight: 700;
    }
    .about__mission { padding: 16px 8px; }
    .about__mission-title {
      margin: 0 0 8px;
      font: var(--mat-sys-headline-small);
      font-weight: 700;
    }
    .about__body {
      margin: 0;
      max-width: 72ch;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class AboutPage {
  protected readonly pillars = PILLARS;
}
