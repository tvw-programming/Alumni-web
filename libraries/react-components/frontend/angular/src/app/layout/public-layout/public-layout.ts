import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { MicToggleButton } from '../../shared/speech/mic-toggle-button';
import { AppBreadcrumbs } from '../../shared/breadcrumbs/app-breadcrumbs';
import { PUBLIC_NAV } from '../navigation';
import { SpeechService } from '../../core/speech/speech.service';
import { ThemeStore } from '../../core/theme/theme-store';
import { navCommandsFor } from '../../core/speech/nav-commands';

/** Public marketing shell: top nav + footer, no admin chrome. */
@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppBreadcrumbs,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MicToggleButton,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  private readonly speech = inject(SpeechService);
  private readonly router = inject(Router);

  protected readonly theme = inject(ThemeStore);
  protected readonly items = PUBLIC_NAV;
  protected readonly year = new Date().getFullYear();

  constructor() {
    const unregister = this.speech.register(
      'public-nav',
      navCommandsFor(this.items, 'Site', (item) => item.path, (path) => {
        void this.router.navigateByUrl(path);
      }),
    );
    inject(DestroyRef).onDestroy(unregister);
  }
}
