import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, ChangeDetectionStrategy, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { MASTER_DATA_NAV } from '../navigation';
import { SpeechService } from '../../core/speech/speech.service';
import { masterDataCommands } from '../../core/speech/nav-commands';

/**
 * Master Data shell: the 13-entry sidebar plus the routed outlet.
 *
 * Permanent sidenav from `md` up, overlay drawer below — the same behaviour as
 * the React `MasterDataLayout`. The entry list comes from `navigation.ts`, so
 * the sidebar, the router and (later) the voice commands cannot disagree.
 */
@Component({
  selector: 'app-master-data-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './master-data-layout.html',
  styleUrl: './master-data-layout.scss',
})
export class MasterDataLayout {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly speech = inject(SpeechService);
  private readonly router = inject(Router);

  protected readonly items = MASTER_DATA_NAV;

  /**
   * `BreakpointObserver` is one of the few Angular APIs that still returns an
   * Observable. It is converted here, at the boundary, so nothing downstream
   * deals with RxJS — the app-wide rule is signals in feature code.
   */
  private readonly handset = toSignal(
    this.breakpoints.observe([Breakpoints.XSmall, Breakpoints.Small]),
    { initialValue: { matches: false, breakpoints: {} } },
  );

  protected readonly isDesktop = computed(() => !this.handset().matches);
  protected readonly drawerOpen = signal(false);

  /**
   * Ordinal numbers are reserved in the layout at all times and only faded in,
   * so toggling their visibility can never reflow a row.
   *
   * They appear only while the microphone is on: they exist to tell the user
   * what to say, and are clutter when nobody is speaking.
   */
  protected readonly showOrdinals = this.speech.showsOrdinals;

  constructor() {
    // Registered here rather than globally: these commands are only meaningful
    // while this shell is on screen, and unregistering on destroy is what stops
    // "second menu" from resolving against a sidebar that is no longer visible.
    const unregister = this.speech.register(
      'master-data-sidebar',
      masterDataCommands(this.items, (path) => {
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
