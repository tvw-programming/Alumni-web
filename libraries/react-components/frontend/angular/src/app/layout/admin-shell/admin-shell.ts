import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AppBreadcrumbs } from '../../shared/breadcrumbs/app-breadcrumbs';
import { ADMIN_NAV } from '../navigation';
import { MicToggleButton } from '../../shared/speech/mic-toggle-button';
import { SpeechService } from '../../core/speech/speech.service';
import { ThemeStore } from '../../core/theme/theme-store';
import { navCommandsFor } from '../../core/speech/nav-commands';

/** Authenticated admin shell: top nav, theme toggle, logout. No public footer. */
@Component({
  selector: 'app-admin-shell',
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
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly speech = inject(SpeechService);
  private readonly router = inject(Router);

  protected readonly theme = inject(ThemeStore);
  protected readonly items = ADMIN_NAV;

  constructor() {
    // No ordinals: only the master-data sidebar answers to position, so that
    // "second menu" always means the same list.
    const unregister = this.speech.register(
      'admin-nav',
      navCommandsFor(this.items, 'Admin', (item) => item.path, (path) => {
        void this.router.navigateByUrl(path);
      }),
    );
    inject(DestroyRef).onDestroy(unregister);
  }
}
