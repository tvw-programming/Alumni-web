import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { AccentCard } from '../../shared/accent-card/accent-card';
import { PageContainer } from '../../shared/page-container/page-container';

import type { AccentName } from '../../shared/accent-card/accent-card';

interface TeamMember {
  readonly name: string;
  readonly role: string;
  readonly blurb: string;
  readonly initials: string;
  readonly accent: AccentName;
}

const TEAM: readonly TeamMember[] = [
  {
    name: 'Engineering',
    role: 'Platform & Frontend',
    blurb: 'Owns the component library, routing and the typed data layer.',
    initials: 'EN',
    accent: 'violet',
  },
  {
    name: 'Design',
    role: 'Product & Brand',
    blurb: 'Defines the visual language and accessibility standards.',
    initials: 'DS',
    accent: 'pink',
  },
  {
    name: 'Data',
    role: 'Analytics & ML',
    blurb: 'Builds the pipelines powering dashboards and live metrics.',
    initials: 'DA',
    accent: 'teal',
  },
  {
    name: 'Operations',
    role: 'Reliability',
    blurb: 'Keeps releases smooth with monitoring and incident response.',
    initials: 'OP',
    accent: 'amber',
  },
];

/** Team page: accent cards per function. */
@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccentCard, MatCardModule, PageContainer],
  template: `
    <app-page-container
      title="Meet the team"
      subtitle="A small, cross-functional team building a polished, reusable dashboard."
    >
      <div class="team__grid">
        @for (member of team; track member.name) {
          <app-accent-card interactive [accent]="member.accent">
            <mat-card-content class="team__card">
              <!-- Decorative: the name below already conveys the identity. -->
              <span class="team__avatar" aria-hidden="true">{{ member.initials }}</span>
              <div>
                <h2 class="team__name">{{ member.name }}</h2>
                <p class="team__role">{{ member.role }}</p>
              </div>
              <p class="team__blurb">{{ member.blurb }}</p>
            </mat-card-content>
          </app-accent-card>
        }
      </div>
    </app-page-container>
  `,
  styles: `
    .team__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 24px;
    }
    .team__card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .team__avatar {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font-weight: 700;
    }
    .team__name {
      margin: 0;
      font: var(--mat-sys-title-medium);
      font-weight: 700;
    }
    .team__role {
      margin: 2px 0 0;
      font: var(--mat-sys-label-medium);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }
    .team__blurb {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class TeamPage {
  protected readonly team = TEAM;
}
