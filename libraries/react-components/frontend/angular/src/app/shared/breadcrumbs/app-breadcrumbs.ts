import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { buildBreadcrumbs } from '../../layout/breadcrumbs';

/**
 * The breadcrumb trail for the current URL.
 *
 * Renders nothing at the top of a hierarchy: a single crumb saying where you
 * already are is noise, and an empty `<nav>` is worse than no `<nav>`.
 *
 * The trail comes from `buildBreadcrumbs`, which reads the same nav arrays the
 * sidebars render — so this never carries its own copy of a page's label.
 */
@Component({
  selector: 'app-breadcrumbs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, RouterLink],
  template: `
    @if (crumbs().length > 1) {
      <nav aria-label="Breadcrumb">
        <ol class="crumbs">
          @for (crumb of crumbs(); track $index) {
            <li class="crumbs__item">
              @if (crumb.path) {
                <a class="crumbs__link" [routerLink]="crumb.path">
                  @if (crumb.path === '/') {
                    <mat-icon class="crumbs__icon">home</mat-icon>
                  }
                  {{ crumb.label }}
                </a>
              } @else {
                <!--
                  The current page: text, not a link. "aria-current" is what
                  tells a screen reader which crumb it is standing on.
                -->
                <span class="crumbs__current" aria-current="page">{{ crumb.label }}</span>
              }

              @if (!$last) {
                <mat-icon class="crumbs__sep" aria-hidden="true">navigate_next</mat-icon>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: `
    :host { display: block; margin-bottom: 16px; }
    .crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .crumbs__item { display: inline-flex; align-items: center; }
    .crumbs__link,
    .crumbs__current {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font: var(--mat-sys-body-medium);
    }
    .crumbs__link {
      color: var(--mat-sys-on-surface-variant);
      text-decoration: none;
      border-radius: 4px;
      padding: 2px 4px;
    }
    .crumbs__link:hover { text-decoration: underline; }
    .crumbs__link:focus-visible { outline: 2px solid var(--mat-sys-primary); outline-offset: 1px; }
    .crumbs__current { font-weight: 600; padding: 2px 4px; }
    .crumbs__icon, .crumbs__sep {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class AppBreadcrumbs {
  private readonly router = inject(Router);

  /**
   * The router's URL as a signal.
   *
   * `Router.events` is one of the few Angular APIs that is still an Observable,
   * so it is converted here at the boundary. `startWith` covers the first
   * render, which happens after the navigation that caused it.
   */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly crumbs = computed(() => {
    const url = this.url();
    const queryIndex = url.indexOf('?');
    const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);
    const search = queryIndex === -1 ? '' : url.slice(queryIndex);
    // The router keeps the URL encoded; `?doc=auth%2Fauth-service.md` has to
    // come back as a path before it can be split into crumbs.
    return buildBreadcrumbs(decodeURIComponent(pathname), search);
  });
}
