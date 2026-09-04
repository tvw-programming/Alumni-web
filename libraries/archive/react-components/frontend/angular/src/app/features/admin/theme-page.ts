import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { GenericCard } from '../../shared/generic-card/generic-card';
import { ThemeStore } from '../../core/theme/theme-store';

import type { ThemeMode } from '../../core/theme/theme-store';

/**
 * Manage Theme.
 *
 * The React app offers three surface styles (plain / glass / 3D gradient glass)
 * plus custom primary and secondary colours, all built on MUI's runtime theme
 * object. Material 3 works differently: colours come from `mat.theme()` at
 * build time and are exposed as `--mat-sys-*` custom properties, so a colour
 * picker would mean re-deriving a full tonal palette in the browser. What
 * carries over — and is what users actually reach for — is the light/dark mode,
 * which the whole app already follows through those same tokens.
 */
@Component({
  selector: 'app-theme-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GenericCard,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="theme">
      <app-generic-card title="Appearance" subtitle="Applies instantly, everywhere" icon="palette">
        <div class="theme__controls">
          <mat-button-toggle-group
            [value]="theme.mode()"
            (change)="setMode($any($event).value)"
            aria-label="Colour mode"
            hideSingleSelectionIndicator
          >
            <mat-button-toggle value="light">
              <mat-icon>light_mode</mat-icon>
              Light
            </mat-button-toggle>
            <mat-button-toggle value="dark">
              <mat-icon>dark_mode</mat-icon>
              Dark
            </mat-button-toggle>
          </mat-button-toggle-group>

          <p class="theme__note">
            The choice is stored in <code>localStorage</code> and restored on the next visit. With
            nothing stored, the app follows the operating system's preference.
          </p>
        </div>
      </app-generic-card>

      <app-generic-card title="Preview" subtitle="Material 3 system tokens" icon="visibility">
        <div class="theme__swatches">
          @for (token of swatches; track token.name) {
            <div class="theme__swatch" [style.background]="'var(--mat-sys-' + token.name + ')'">
              <span [style.color]="'var(--mat-sys-' + token.on + ')'">{{ token.label }}</span>
            </div>
          }
        </div>
        <div class="theme__buttons">
          <button mat-flat-button type="button">Filled</button>
          <button mat-stroked-button type="button">Outlined</button>
          <button mat-button type="button">Text</button>
          <mat-slide-toggle checked>Toggle</mat-slide-toggle>
        </div>
      </app-generic-card>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .theme {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      align-items: start;
    }
    .theme__controls {
      display: flex;
      flex-direction: column;
      align-items: flex-start; /* keep the toggle group at its content width */
      gap: 16px;
    }
    .theme__note {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .theme__swatches {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .theme__swatch {
      display: grid;
      place-items: center;
      min-height: 64px;
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      font: var(--mat-sys-label-large);
    }
    .theme__buttons {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }
  `,
})
export class ThemePage {
  protected readonly theme = inject(ThemeStore);

  /** Token pairs, so each swatch labels itself in a legible colour. */
  protected readonly swatches = [
    { name: 'primary', on: 'on-primary', label: 'Primary' },
    { name: 'secondary', on: 'on-secondary', label: 'Secondary' },
    { name: 'tertiary', on: 'on-tertiary', label: 'Tertiary' },
    { name: 'error', on: 'on-error', label: 'Error' },
    { name: 'surface-container', on: 'on-surface', label: 'Surface' },
  ];

  protected setMode(mode: ThemeMode): void {
    this.theme.set(mode);
  }
}
