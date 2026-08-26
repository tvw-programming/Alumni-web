import {
  DomainAppearanceBoundary,
  DomainSurface,
  DomainThemeProvider,
  DOMAIN_VISUALS,
  needsDomainSurface,
} from '@idol-ui/react';
import Card from '@mui/material/Card';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createAppTheme } from '@/theme/factory';

import catalogue from '../../../../public/domain-catalogue.json';

import { type CatalogueEntry } from './useDomainCatalogue';

/**
 * The generated catalogue, as the app actually receives it.
 *
 * Asserting against `public/domain-catalogue.json` rather than a bundled
 * constant means these tests also fail when the file is stale or missing —
 * which is the new failure mode now that the index is generated at `predev`
 * and `prebuild` instead of globbed into the bundle.
 */
const ENTRIES = catalogue.components as readonly CatalogueEntry[];

import type { ThemeSettings } from '@/theme/types';

/**
 * The boundary contract, tested where it is actually consumed.
 *
 * jsdom does not run the CSS cascade, so this asserts the *contract* the
 * stylesheet depends on — the scope class, the appearance attribute, the custom
 * properties and the injected rules — rather than a computed background colour.
 * The painted result belongs to visual regression, which is a later step.
 */

function settings(overrides: Partial<ThemeSettings> = {}): ThemeSettings {
  return {
    mode: 'light',
    style: 'plain',
    primaryColor: '#1e5aa8',
    secondaryColor: '#f0a03c',
    ...overrides,
  };
}

function renderInTheme(ui: React.ReactNode, themeSettings: ThemeSettings = settings()) {
  return render(<ThemeProvider theme={createAppTheme(themeSettings)}>{ui}</ThemeProvider>);
}

/**
 * All injected CSS, with whitespace around combinators normalised.
 *
 * Emotion minifies `a > b` to `a>b` and splits the sheet across many `<style>`
 * tags. Normalising keeps the assertions readable without coupling them to the
 * minifier — and deliberately preserves the descendant space, because the
 * difference between `a b` and `a>b` is the whole point of the Paper rule.
 */
function injectedCss(): string {
  return [...document.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('\n')
    .replace(/\s*>\s*/g, ' > ')
    .replace(/[ \t]+/g, ' ');
}

/**
 * The scope boundary, by class.
 *
 * Testing Library's queries are deliberately not used here: the boundary is a
 * `display: contents` decoration with no role, no label and no text — it is
 * invisible to every accessible query, which is exactly the property that makes
 * it safe to wrap arbitrary components in. The DOM contract *is* the subject.
 */
function scopeOf(container: HTMLElement): HTMLElement {
  // eslint-disable-next-line testing-library/no-node-access -- see above.
  const scope = container.querySelector<HTMLElement>('.idol-domain-scope');
  if (scope === null) throw new Error('no domain scope rendered');
  return scope;
}

/**
 * The explicit surface a host wraps a surface-less component in.
 *
 * Queried by class for the same reason as `scopeOf`: it is a decoration with no
 * role, no label and no text, and being invisible to accessible queries is
 * precisely the property that makes it safe to wrap anything in.
 */
function surfaceOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('.idol-domain-surface');
}

describe('DomainThemeProvider', () => {
  it('renders a scope carrying the domain and the resolved appearance', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="fintech" appearance="gradientGlass">
        <Card>content</Card>
      </DomainThemeProvider>,
      settings({ style: 'glass' }),
    );

    const scope = scopeOf(container);
    expect(scope.dataset.domain).toBe('fintech');
    expect(scope.getAttribute('data-domain-appearance')).toBe('gradientGlass');
  });

  it('puts the domain hue and derived values on the element as custom properties', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="iot">
        <Card>content</Card>
      </DomainThemeProvider>,
    );

    const scope = scopeOf(container);
    expect(scope.style.getPropertyValue('--domain-hue')).toBe(DOMAIN_VISUALS.iot.hue);
    // Every value the stylesheet reads must be present, or a rule silently
    // resolves to nothing and the surface renders untouched.
    for (const name of [
      '--domain-surface',
      '--domain-border',
      '--domain-gradient',
      '--domain-shadow',
      '--domain-highlight',
      '--domain-mesh',
    ]) {
      expect(scope.style.getPropertyValue(name)).not.toBe('');
    }
  });

  it('injects the stylesheet once, however deeply providers nest', () => {
    renderInTheme(
      <DomainThemeProvider domain="ecommerce">
        <DomainThemeProvider domain="fintech">
          <DomainThemeProvider domain="media">
            <Card>content</Card>
          </DomainThemeProvider>
        </DomainThemeProvider>
      </DomainThemeProvider>,
    );

    // Emotion splits one stylesheet across many <style> tags, so counting tags
    // proves nothing. Counting a rule that appears exactly once per injection
    // does: three nested providers must still yield one copy.
    // Whitespace-insensitive here: only the number of copies matters, not the
    // formatting, so all spacing is removed before counting.
    const compact = injectedCss().replace(/\s+/g, '');
    const copies = compact.split('.idol-domain-scope{display:contents;}').length - 1;
    expect(copies).toBe(1);
  });

  it('scopes Paper to a direct child so menus and dialogs stay untinted', () => {
    renderInTheme(
      <DomainThemeProvider domain="fintech">
        <Card>content</Card>
      </DomainThemeProvider>,
    );

    const css = injectedCss();

    // Cards are matched as descendants…
    expect(css).toContain(".idol-domain-scope[data-domain-appearance='plain'] .MuiCard-root");
    // …Paper only as a direct child. A descendant match would reach every
    // popover, drawer and dialog the app renders.
    expect(css).toContain(".idol-domain-scope[data-domain-appearance='plain'] > .MuiPaper-root");
    // The descendant form must NOT exist. This is the assertion that keeps a
    // domain tint out of every menu and dialog in the application.
    expect(css).not.toContain("data-domain-appearance='plain'] .MuiPaper-root");
  });

  it('reduces motion in the same block as the lift', () => {
    renderInTheme(
      <DomainThemeProvider domain="fintech">
        <Card>c</Card>
      </DomainThemeProvider>,
    );
    expect(injectedCss()).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('appearance resolution against the real app theme', () => {
  it('inherit follows a glass theme', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="social">
        <Card>c</Card>
      </DomainThemeProvider>,
      settings({ style: 'glass' }),
    );
    expect(scopeOf(container).getAttribute('data-domain-appearance')).toBe('gradientGlass');
  });

  it('inherit follows a 3D glass theme', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="social">
        <Card>c</Card>
      </DomainThemeProvider>,
      settings({ style: 'glass3d' }),
    );
    expect(scopeOf(container).getAttribute('data-domain-appearance')).toBe('glass3d');
  });

  it('inherit is plain in a plain theme — the app renders exactly as before', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="social">
        <Card>c</Card>
      </DomainThemeProvider>,
      settings({ style: 'plain' }),
    );
    expect(scopeOf(container).getAttribute('data-domain-appearance')).toBe('plain');
  });

  it('degrades a glass request to plain when the theme has no glass', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="social" appearance="glass3d">
        <Card>c</Card>
      </DomainThemeProvider>,
      settings({ style: 'plain' }),
    );
    expect(scopeOf(container).getAttribute('data-domain-appearance')).toBe('plain');
  });

  it('keeps mesh in a plain theme — it never needed the glass layer', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="social" appearance="mesh">
        <Card>c</Card>
      </DomainThemeProvider>,
      settings({ style: 'plain' }),
    );
    expect(scopeOf(container).getAttribute('data-domain-appearance')).toBe('mesh');
  });

  it('produces a different surface value in dark mode', () => {
    let view = renderInTheme(
      <DomainThemeProvider domain="fitness">
        <Card>c</Card>
      </DomainThemeProvider>,
      settings({ mode: 'light' }),
    );
    const lightSurface = scopeOf(view.container).style.getPropertyValue('--domain-surface');
    view.unmount();

    view = renderInTheme(
      <DomainThemeProvider domain="fitness">
        <Card>c</Card>
      </DomainThemeProvider>,
      settings({ mode: 'dark' }),
    );
    const darkSurface = scopeOf(view.container).style.getPropertyValue('--domain-surface');

    expect(lightSurface).not.toBe(darkSurface);
  });
});

describe('DomainAppearanceBoundary', () => {
  it('changes the appearance while inheriting the domain, with no component prop', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="travel" appearance="plain">
        <Card>outer</Card>
        <DomainAppearanceBoundary appearance="mesh">
          <Card>inner</Card>
        </DomainAppearanceBoundary>
      </DomainThemeProvider>,
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see scopeOf.
    const scopes = container.querySelectorAll<HTMLElement>('.idol-domain-scope');
    expect(scopes).toHaveLength(2);
    expect(scopes[0].getAttribute('data-domain-appearance')).toBe('plain');
    expect(scopes[1].getAttribute('data-domain-appearance')).toBe('mesh');
    // The domain travels down; only the appearance changed.
    expect(scopes[1].dataset.domain).toBe('travel');
    expect(scopes[1].style.getPropertyValue('--domain-hue')).toBe(DOMAIN_VISUALS.travel.hue);
  });
});

describe('custom visuals', () => {
  it('themes a domain the registry has never heard of', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="logistics" visuals={{ hue: '#ff8800', motif: 'route' }}>
        <Card>c</Card>
      </DomainThemeProvider>,
    );
    expect(scopeOf(container).style.getPropertyValue('--domain-hue')).toBe('#ff8800');
  });

  it('renders children untouched when nothing is configured', () => {
    renderInTheme(
      <DomainThemeProvider>
        <Card>still here</Card>
      </DomainThemeProvider>,
    );
    expect(screen.getByText('still here')).toBeInTheDocument();
  });
});

/**
 * What the gallery does with the tier the registry stamped on each entry.
 *
 * The wrapping decision is the whole of tier C2's coverage: get it wrong in
 * either direction and either 32 components render untouched, or 49 render a
 * tinted box around an already-tinted card. Neither fails anything on its own,
 * which is why it is asserted here.
 */
describe('the wrapper the gallery adds for surface-less components', () => {
  it('gives a surface-less component something for the selectors to paint', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="ecommerce" appearance="plain">
        <DomainSurface>
          <div>a component that renders no surface</div>
        </DomainSurface>
      </DomainThemeProvider>,
    );

    expect(surfaceOf(container)).not.toBeNull();
    expect(screen.getByText('a component that renders no surface')).toBeInTheDocument();
  });

  it('sets no inline border, so the scoped border-color can win', () => {
    /*
     * The regression: the wrapper used to carry `border: 1px solid transparent`
     * in a style attribute. Inline styles outrank the sheet, so the domain
     * border-color never applied and every wrapped component rendered an
     * invisible border while the cards beside it showed the domain colour —
     * visible only by measuring a computed style in a real browser.
     */
    const { container } = renderInTheme(
      <DomainThemeProvider domain="ecommerce" appearance="plain">
        <DomainSurface>
          <div>wrapped</div>
        </DomainSurface>
      </DomainThemeProvider>,
    );

    const surface = surfaceOf(container);
    expect(surface).not.toBeNull();
    expect(surface?.style.border).toBe('');
    expect(surface?.style.borderColor).toBe('');

    // The reserved space moved to the sheet rather than disappearing. Compared
    // with all whitespace stripped from both sides, because Emotion minifies
    // the declaration and the assertion should not care.
    const squashed = (text: string) => text.replace(/\s+/g, '');
    expect(squashed(injectedCss())).toContain(
      squashed(
        '.idol-domain-surface { border: 1px solid transparent; border-radius: 12px; padding: 12px; }',
      ),
    );
  });

  it('still lets a caller override with an inline style', () => {
    const { container } = renderInTheme(
      <DomainThemeProvider domain="ecommerce" appearance="plain">
        <DomainSurface style={{ borderRadius: 2 }}>
          <div>wrapped</div>
        </DomainSurface>
      </DomainThemeProvider>,
    );

    expect(surfaceOf(container)?.style.borderRadius).toBe('2px');
  });

  it('the stylesheet paints that wrapper in every appearance', () => {
    renderInTheme(
      <DomainThemeProvider domain="fintech" appearance="plain">
        <div />
      </DomainThemeProvider>,
    );

    const css = injectedCss();
    for (const appearance of ['plain', 'gradientGlass', 'glass3d', 'mesh', 'animated']) {
      expect(css).toContain(
        `.idol-domain-scope[data-domain-appearance='${appearance}'] .idol-domain-surface`,
      );
    }
  });

  it('asks for a wrapper on a real surface-less component, and not on a card one', () => {
    // Reads the generated catalogue rather than a fixture: if a component is
    // rewritten to render a Card, this follows it.
    const surfaceless = ENTRIES.filter((entry) => entry.surfaceTier === 'no-surface');
    const cards = ENTRIES.filter((entry) => entry.surfaceTier === 'surface-root');

    expect(surfaceless.length).toBeGreaterThan(0);
    expect(cards.length).toBeGreaterThan(0);
    expect(surfaceless.every((entry) => needsDomainSurface(entry.surfaceTier))).toBe(true);
    expect(cards.some((entry) => needsDomainSurface(entry.surfaceTier))).toBe(false);
  });

  it('classifies every catalogue entry, so none is wrapped by accident', () => {
    // `null` means the root could not be read. `needsDomainSurface` says false
    // for it, so an unclassified component would silently render untreated.
    const unclassified = ENTRIES.filter((entry) => entry.surfaceTier === null);
    expect(unclassified.map((entry) => entry.id)).toEqual([]);
  });
});

describe('the animated appearance', () => {
  it('resolves without the glass layer, like mesh', () => {
    // Both are painted with gradients and transforms rather than backdrop
    // blur, so a plain theme is no obstacle — the picker offers them always.
    const { container } = renderInTheme(
      <DomainThemeProvider domain="media" appearance="animated">
        <Card>media</Card>
      </DomainThemeProvider>,
      settings({ style: 'plain' }),
    );

    expect(scopeOf(container).dataset.domainAppearance).toBe('animated');
  });

  it('stops its motion under prefers-reduced-motion', () => {
    renderInTheme(
      <DomainThemeProvider domain="media" appearance="animated">
        <Card>media</Card>
      </DomainThemeProvider>,
    );

    const css = injectedCss();
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});
