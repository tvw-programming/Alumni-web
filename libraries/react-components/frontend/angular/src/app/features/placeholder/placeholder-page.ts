import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

/**
 * Temporary stand-in for pages that arrive in later phases.
 *
 * It exists so routing, the sidebar and the shells can be verified end to end
 * now, rather than after every feature is written. `input()` is the signal-based
 * replacement for `@Input()`; routes supply the title via `withComponentInputBinding`.
 */
@Component({
  selector: 'app-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>{{ title() }}</mat-card-title>
        <mat-card-subtitle>Not implemented yet</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>This screen is scheduled for a later phase of the Angular port.</p>
      </mat-card-content>
    </mat-card>
  `,
})
export class PlaceholderPage {
  readonly title = input('Page');
}
