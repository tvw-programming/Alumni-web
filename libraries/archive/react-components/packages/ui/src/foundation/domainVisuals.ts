/**
 * Domain identity tokens.
 *
 * Layer 0 of domain theming: **pure data and pure functions, zero imports**.
 * Deliberately no MUI import — the library takes MUI as a peer dependency, and
 * a token table that cannot be evaluated without it is a token table that
 * cannot be unit-tested in isolation.
 *
 * Everything a domain looks like derives from **one hue**. Adding a domain is
 * one line; restyling one is one hex value.
 */

/** The motifs `DomainGlyph` can draw. One per domain, extensible. */
export type MotifId =
  | 'bag'
  | 'chart'
  | 'pulse'
  | 'chat'
  | 'grid'
  | 'board'
  | 'signal'
  | 'route'
  | 'play'
  | 'ring';

/**
 * The Material icon each domain is identified by.
 *
 * A closed union rather than a free string: `DomainIcon` maps these to real
 * imports, and a typo would otherwise render nothing at all with no error.
 */
export type DomainIconId =
  | 'shoppingBag'
  | 'accountBalance'
  | 'monitorHeart'
  | 'forum'
  | 'insights'
  | 'viewKanban'
  | 'sensors'
  | 'flightTakeoff'
  | 'movie'
  | 'fitnessCenter';

export interface DomainVisualConfig {
  /** Base hue as `#rrggbb`. Every other value is derived from it. */
  readonly hue: string;
  readonly motif: MotifId;
  /** Material icon for the domain, used wherever the domain itself is named. */
  readonly icon: DomainIconId;
}

/**
 * Defaults for the domains this library ships.
 *
 * `as const satisfies` rather than a plain `Record<string, …>`: the `satisfies`
 * half checks every entry against the shape, and the `as const` half keeps the
 * literal keys so `DomainId` is a union of the real ids rather than `string`.
 *
 * This is a **default table, not the only way in** — `resolveDomainVisuals`
 * accepts an explicit override, so a host app can theme a domain this library
 * has never heard of.
 */
export const DOMAIN_VISUALS = {
  ecommerce: { hue: '#7c63ff', motif: 'bag', icon: 'shoppingBag' },
  fintech: { hue: '#18c2c2', motif: 'chart', icon: 'accountBalance' },
  healthcare: { hue: '#ff5fa2', motif: 'pulse', icon: 'monitorHeart' },
  social: { hue: '#3b82f6', motif: 'chat', icon: 'forum' },
  dashboard: { hue: '#f59e0b', motif: 'grid', icon: 'insights' },
  collaboration: { hue: '#8b5cf6', motif: 'board', icon: 'viewKanban' },
  iot: { hue: '#10b981', motif: 'signal', icon: 'sensors' },
  travel: { hue: '#0ea5e9', motif: 'route', icon: 'flightTakeoff' },
  media: { hue: '#ef4444', motif: 'play', icon: 'movie' },
  fitness: { hue: '#a3e635', motif: 'ring', icon: 'fitnessCenter' },
} as const satisfies Record<string, DomainVisualConfig>;

/** The ids in the default table. Not a closed set — see `resolveDomainVisuals`. */
export type DomainId = keyof typeof DOMAIN_VISUALS;

/** Used when a domain is unknown and no override was supplied. */
export const FALLBACK_VISUALS: DomainVisualConfig = {
  hue: '#64748b',
  motif: 'grid',
  icon: 'insights',
};

/**
 * The visuals for a domain: an explicit override wins, then the default table,
 * then a neutral fallback.
 *
 * An unknown domain never throws. A gallery that renders whatever folders exist
 * on disk will meet ids this table has not been told about, and a crash there
 * would be a worse outcome than a grey card.
 */
export function resolveDomainVisuals(
  domain: string | undefined,
  override?: Partial<DomainVisualConfig>,
): DomainVisualConfig {
  const base: DomainVisualConfig =
    domain !== undefined && domain in DOMAIN_VISUALS
      ? DOMAIN_VISUALS[domain as DomainId]
      : FALLBACK_VISUALS;

  if (override === undefined) return base;
  /*
   * Spread the base first, then the caller's set keys. Listing the fields by
   * hand — which is what this did — silently drops any field added later: the
   * icon went missing the day it was introduced, and only the type checker
   * noticed. `undefined` values in the override must not win, hence the filter
   * rather than a plain spread of `override`.
   */
  return {
    ...base,
    ...Object.fromEntries(Object.entries(override).filter(([, value]) => value !== undefined)),
  };
}

/* ------------------------------------------------------------------ */
/* Colour maths. Kept here so Layer 0 has no dependencies whatsoever.  */
/* ------------------------------------------------------------------ */

/** `#7c63ff` → `[124, 99, 255]`. Supports `#rgb` and `#rrggbb`. */
export function parseHex(hex: string): readonly [number, number, number] | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((character) => character + character)
          .join('')
      : value;

  if (!/^[0-9a-f]{6}$/i.test(full)) return null;

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ] as const;
}

/**
 * `withAlpha('#7c63ff', 0.45)` → `rgba(124, 99, 255, 0.45)`.
 *
 * MUI's `alpha()` would do this, and importing it would make Layer 0 depend on
 * a peer dependency that is only reliably resolvable from the host app. Twelve
 * lines is cheaper than that coupling.
 *
 * An unparseable colour is returned unchanged rather than throwing: a wrong
 * colour is a visual bug, a thrown error is a blank screen.
 */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (rgb === null) return hex;
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${String(rgb[0])}, ${String(rgb[1])}, ${String(rgb[2])}, ${String(clamped)})`;
}

/**
 * Relative luminance (WCAG 2.x), used to check that a tint stays readable.
 *
 * Exported because the contrast assertions in the test suite are the only thing
 * standing between "a nice tint" and "unreadable in dark mode".
 */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (rgb === null) return 0;
  const [red, green, blue] = rgb.map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two opaque colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b));
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}
