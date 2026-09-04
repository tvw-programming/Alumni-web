import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { DOCUMENTATION_NAV, documentationPath } from '../navigation';
import { SpeechService } from '../../core/speech/speech.service';
import { navCommandsFor } from '../../core/speech/nav-commands';

/**
 * The Documentation shell: its own sidebar plus the routed outlet.
 *
 * A sibling of `MasterDataLayout`, not a variant of it — the two sections have
 * different sidebars and different content, and sharing one component would
 * mean an input deciding which nav array to read, which is the point at which a
 * shared layout stops paying for itself.
 *
 * Deliberately **no ordinal gutter**. Only one list in the app may answer to
 * "second menu" (see `core/speech/ordinals.ts`); Master Data owns that, so this
 * sidebar registers named commands only.
 */
@Component({
  selector: 'app-documentation-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './documentation-layout.html',
  styleUrl: './documentation-layout.scss',
})
export class DocumentationLayout {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly speech = inject(SpeechService);
  private readonly router = inject(Router);

  protected readonly items = DOCUMENTATION_NAV;

  private readonly handset = toSignal(
    this.breakpoints.observe([Breakpoints.XSmall, Breakpoints.Small]),
    { initialValue: { matches: false, breakpoints: {} } },
  );

  protected readonly isDesktop = computed(() => !this.handset().matches);
  protected readonly drawerOpen = signal(false);

  constructor() {
    const unregister = this.speech.register(
      'documentation-sidebar',
      navCommandsFor(this.items, 'Documentation', documentationPath, (path) => {
        void this.router.navigateByUrl(path);
        this.closeDrawerOnMobile();
      }),
    );
    inject(DestroyRef).onDestroy(unregister);
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawerOnMobile(): void {
    if (!this.isDesktop()) this.drawerOpen.set(false);
  }
}
