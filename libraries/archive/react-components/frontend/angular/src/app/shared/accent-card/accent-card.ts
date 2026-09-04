import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

/** Accent names shared by the public pages. Values are CSS gradients. */
export const ACCENTS = {
  violet: 'linear-gradient(135deg, #8a6ec4, #5b6ee1)',
  pink: 'linear-gradient(135deg, #d4699b, #c8553d)',
  teal: 'linear-gradient(135deg, #3aa8a8, #54b567)',
  amber: 'linear-gradient(135deg, #e8a33a, #e8833a)',
} as const;

export type AccentName = keyof typeof ACCENTS;

/**
 * Surface with an optional accent bar and hover lift.
 *
 * The React counterpart (`GlassCard`) also carried the glassmorphism theme
 * styles. Those are a MUI-specific `sx` construct with no Material equivalent,
 * so what survives the port is the part that carries meaning: the accent stripe
 * and the interactive affordance.
 */
@Component({
  selector: 'app-accent-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
  template: `
    <mat-card
      class="accent-card"
      [class.accent-card--interactive]="interactive()"
      appearance="outlined"
    >
      @if (accent()) {
        <span class="accent-card__bar" [style.background]="accentValue()" aria-hidden="true"></span>
      }
      <ng-content />
    </mat-card>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .accent-card {
      position: relative;
      height: 100%;
      overflow: hidden;
      transition:
        transform 180ms ease,
        box-shadow 180ms ease;
    }
    .accent-card__bar {
      position: absolute;
      inset-block-start: 0;
      inset-inline: 0;
      height: 4px;
    }
    .accent-card--interactive:hover {
      transform: translateY(-4px);
      box-shadow: var(--mat-sys-level3);
    }
    /* Motion is decoration here; honour the OS preference. */
    @media (prefers-reduced-motion: reduce) {
      .accent-card { transition: none; }
      .accent-card--interactive:hover { transform: none; }
    }
  `,
})
export class AccentCard {
  readonly accent = input<AccentName>();
  /**
   * `booleanAttribute` so callers can write a bare `interactive` the way they
   * would on a native element, instead of `[interactive]="true"`.
   */
  readonly interactive = input(false, { transform: booleanAttribute });

  protected readonly accentValue = computed(() => {
    const name = this.accent();
    return name ? ACCENTS[name] : null;
  });
}
