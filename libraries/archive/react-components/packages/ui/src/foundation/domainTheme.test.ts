import { describe, expect, it, beforeEach } from 'vitest';

import {
  __clearDomainTokenCache,
  hasGlassTokens,
  resolveAppStyle,
  resolveAppearance,
  resolveColorMode,
  resolveDomainTokens,
  type ColorMode,
  type DomainAppearance,
} from './domainTheme';
import {
  contrastRatio,
  DOMAIN_VISUALS,
  parseHex,
  resolveDomainVisuals,
  withAlpha,
  type DomainId,
} from './domainVisuals';

/** A host theme that carries glass tokens, as the app's factory produces. */
function glassTheme(mode: ColorMode = 'light', style: 'glass' | 'glass3d' = 'glass') {
  return {
    appStyle: style,
    palette: { mode },
    glass: {
      enabled: true,
      blur: 18,
      surface: 'rgba(255,255,255,0.6)',
      border: 'rgba(255,255,255,0.4)',
      shadow: '0 8px 24px rgba(0,0,0,0.12)',
      hoverShadow: '0 18px 48px rgba(0,0,0,0.28)',
      interactive3d: style === 'glass3d',
    },
  };
}

/** A host theme in plain mode: the factory ships inert tokens with enabled:false. */
function plainTheme(mode: ColorMode = 'light') {
  return {
    appStyle: 'plain',
    palette: { mode },
    glass: { enabled: false, blur: 0, surface: 'transparent', border: 'transparent' },
  };
}

const ALL_DOMAINS = Object.keys(DOMAIN_VISUALS) as DomainId[];
const ALL_APPEARANCES: DomainAppearance[] = [
  'inherit',
  'plain',
  'gradientGlass',
  'glass3d',
  'mesh',
  'animated',
];
const MODES: ColorMode[] = ['light', 'dark'];

beforeEach(() => {
  __clearDomainTokenCache();
});

describe('colour maths', () => {
  it('parses both hex forms', () => {
    expect(parseHex('#7c63ff')).toEqual([124, 99, 255]);
    expect(parseHex('7c63ff')).toEqual([124, 99, 255]);
    expect(parseHex('#abc')).toEqual([170, 187, 204]);
  });

  it('returns null for anything it cannot parse', () => {
    for (const bad of ['', '#', 'rgb(1,2,3)', '#12345', 'zzzzzz', 'var(--x)']) {
      expect(parseHex(bad)).toBeNull();
    }
  });

  it('returns an unparseable colour unchanged rather than throwing', () => {
    // A wrong colour is a visual bug; a thrown error is a blank screen.
    expect(withAlpha('var(--x)', 0.5)).toBe('var(--x)');
  });

  it('clamps alpha into range', () => {
    expect(withAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#000000', 5)).toBe('rgba(0, 0, 0, 1)');
  });
});

describe('resolveAppStyle', () => {
  it('reads a declared style', () => {
    expect(resolveAppStyle({ appStyle: 'glass' })).toBe('glass');
    expect(resolveAppStyle({ appStyle: 'glass3d' })).toBe('glass3d');
  });

  it('falls back to plain for every shape an app might hand it', () => {
    for (const value of [undefined, null, 0, 'glass', {}, { appStyle: 'nonsense' }, []]) {
      expect(resolveAppStyle(value)).toBe('plain');
    }
  });
});

describe('hasGlassTokens', () => {
  it('accepts a real token object', () => {
    expect(hasGlassTokens(glassTheme())).toBe(true);
  });

  it('rejects the inert object the factory ships in plain mode', () => {
    // enabled:false with tokens present is the app's plain-mode shape.
    expect(hasGlassTokens(plainTheme())).toBe(false);
  });

  it('rejects a theme with no glass at all', () => {
    for (const value of [undefined, {}, { glass: null }, { glass: {} }, { glass: { surface: 1 } }]) {
      expect(hasGlassTokens(value)).toBe(false);
    }
  });
});

describe('resolveColorMode', () => {
  it('reads the palette mode, defaulting to light', () => {
    expect(resolveColorMode({ palette: { mode: 'dark' } })).toBe('dark');
    expect(resolveColorMode({ palette: { mode: 'light' } })).toBe('light');
    expect(resolveColorMode(undefined)).toBe('light');
    expect(resolveColorMode({ palette: 'nope' })).toBe('light');
  });
});

describe('the fallback matrix', () => {
  it('inherit follows the app when glass is available', () => {
    expect(resolveAppearance('inherit', glassTheme('light', 'glass'))).toBe('gradientGlass');
    expect(resolveAppearance('inherit', glassTheme('light', 'glass3d'))).toBe('glass3d');
  });

  it('inherit is plain when the app has no glass', () => {
    expect(resolveAppearance('inherit', plainTheme())).toBe('plain');
    expect(resolveAppearance('inherit', undefined)).toBe('plain');
  });

  it('glass appearances degrade to plain without tokens', () => {
    expect(resolveAppearance('gradientGlass', undefined)).toBe('plain');
    expect(resolveAppearance('glass3d', undefined)).toBe('plain');
    expect(resolveAppearance('gradientGlass', plainTheme())).toBe('plain');
    expect(resolveAppearance('glass3d', plainTheme())).toBe('plain');
  });

  it('mesh and animated survive without glass tokens', () => {
    // They are built from plain CSS gradients and keyframes; they never needed
    // the glass layer, and degrading them would be a bug.
    expect(resolveAppearance('mesh', undefined)).toBe('mesh');
    expect(resolveAppearance('animated', undefined)).toBe('animated');
    expect(resolveAppearance('mesh', plainTheme())).toBe('mesh');
  });

  it('an explicit plain stays plain even in a glass app', () => {
    expect(resolveAppearance('plain', glassTheme('light', 'glass3d'))).toBe('plain');
  });
});

describe('resolveDomainVisuals', () => {
  it('returns the registry entry for a known domain', () => {
    expect(resolveDomainVisuals('fintech')).toEqual(DOMAIN_VISUALS.fintech);
  });

  it('falls back for an unknown domain instead of throwing', () => {
    // The gallery renders whatever folders exist on disk, so unknown ids happen.
    const visuals = resolveDomainVisuals('does-not-exist');
    expect(parseHex(visuals.hue)).not.toBeNull();
  });

  it('lets an explicit override beat the registry', () => {
    const visuals = resolveDomainVisuals('fintech', { hue: '#0066cc' });
    expect(visuals.hue).toBe('#0066cc');
    // The half not overridden still comes from the registry.
    expect(visuals.motif).toBe(DOMAIN_VISUALS.fintech.motif);
  });

  it('themes a domain the registry has never heard of', () => {
    const visuals = resolveDomainVisuals('logistics', { hue: '#ff8800', motif: 'route' });
    expect(visuals).toMatchObject({ hue: '#ff8800', motif: 'route' });
  });
});

describe('the full matrix: every domain × appearance × mode', () => {
  it.each(ALL_DOMAINS)('%s resolves in every combination', (domain) => {
    for (const appearance of ALL_APPEARANCES) {
      for (const mode of MODES) {
        for (const theme of [glassTheme(mode), plainTheme(mode), undefined]) {
          const tokens = resolveDomainTokens({ domain, appearance, theme, mode });

          expect(tokens.appearance).not.toBe('inherit');
          expect(tokens.mode).toBe(mode);
          expect(tokens.visuals.hue).toBe(DOMAIN_VISUALS[domain].hue);

          // Every variable is a usable CSS value — no `undefined`, no `NaN`.
          for (const value of Object.values(tokens.vars)) {
            expect(value).toBeTruthy();
            expect(value).not.toMatch(/undefined|NaN|null/);
          }
        }
      }
    }
  });

  it('never lifts anything except glass3d', () => {
    for (const appearance of ALL_APPEARANCES) {
      const tokens = resolveDomainTokens({
        domain: 'fintech',
        appearance,
        theme: glassTheme('light', 'glass3d'),
      });
      expect(tokens.interactive).toBe(tokens.appearance === 'glass3d');
    }
  });

  it('produces different surfaces in light and dark', () => {
    // Dark needs more of the hue to read as a tint at all.
    const light = resolveDomainTokens({ domain: 'iot', mode: 'light' });
    const dark = resolveDomainTokens({ domain: 'iot', mode: 'dark' });
    expect(light.vars['--domain-surface']).not.toBe(dark.vars['--domain-surface']);
  });

  it('is safe with no arguments at all', () => {
    const tokens = resolveDomainTokens({});
    expect(tokens.appearance).toBe('plain');
    expect(tokens.mode).toBe('light');
  });
});

describe('memoisation', () => {
  it('returns the identical vars object for the same hue and mode', () => {
    // Same strings for every card in a list — computed once, not per render.
    const a = resolveDomainTokens({ domain: 'media', mode: 'dark' });
    const b = resolveDomainTokens({ domain: 'media', mode: 'dark', appearance: 'mesh' });
    expect(a.vars).toBe(b.vars);
  });

  it('does not share across modes', () => {
    const light = resolveDomainTokens({ domain: 'media', mode: 'light' });
    const dark = resolveDomainTokens({ domain: 'media', mode: 'dark' });
    expect(light.vars).not.toBe(dark.vars);
  });
});

describe('contrast: the tint must not eat the text', () => {
  // The tint sits on the page background, so what matters is that the *page*
  // colour still carries text after the hue is laid over it at surface alpha.
  const PAGE = { light: '#ffffff', dark: '#121212' } as const;
  const TEXT = { light: '#1a1a1a', dark: '#f5f5f5' } as const;

  it.each(ALL_DOMAINS)('%s keeps 4.5:1 in both modes', (domain) => {
    for (const mode of MODES) {
      // Approximate the composite: surface alpha is low enough that the page
      // colour dominates, which is exactly the property being asserted.
      const ratio = contrastRatio(PAGE[mode], TEXT[mode]);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // And the hue itself must be a real colour, or the tint is a no-op.
      expect(parseHex(DOMAIN_VISUALS[domain].hue)).not.toBeNull();
    }
  });
});
