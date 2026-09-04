import { motifBackgroundImage } from './domainMotifs';
import {
  resolveDomainVisuals,
  withAlpha,
  type DomainVisualConfig,
  type MotifId,
} from './domainVisuals';

/**
 * Layer 1 of domain theming: the resolver, and the **only** place in this
 * library that reads the host app's theme defensively.
 *
 * `theme.appStyle` and `theme.glass` are declared by MUI module augmentation in
 * the host app. This package compiles with `include: ["src"]` and no path
 * mapping, so it cannot see that augmentation — and should not: the library has
 * to work in an app that has no glass theme at all.
 *
 * Every cast lives here. Nothing downstream repeats it.
 */

export type ColorMode = 'light' | 'dark';

/** The host app's visual style, as far as this library is concerned. */
export type AppStyle = 'plain' | 'glass' | 'glass3d';

/** What a caller asks for. `inherit` follows the app and is the default. */
export type DomainAppearance =
  | 'inherit'
  | 'plain'
  | 'gradientGlass'
  | 'glass3d'
  | 'mesh'
  | 'animated';

/** What a caller actually gets, once availability has been taken into account. */
export type ResolvedAppearance = Exclude<DomainAppearance, 'inherit'>;

/**
 * The optional shape this library reads off the host theme.
 *
 * Documented as a type so the contract is reviewable, and never used as an
 * assertion — the values are validated at runtime instead.
 */
export interface AppSurfaceContract {
  readonly appStyle?: AppStyle;
  readonly glass?: {
    readonly enabled?: boolean;
    readonly blur?: number;
    readonly surface?: string;
    readonly border?: string;
    readonly shadow?: string;
    readonly hoverShadow?: string;
    readonly interactive3d?: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The host's style, or `plain` when the app does not declare one. */
export function resolveAppStyle(theme: unknown): AppStyle {
  if (!isRecord(theme)) return 'plain';
  const candidate = theme.appStyle;
  return candidate === 'glass' || candidate === 'glass3d' ? candidate : 'plain';
}

/**
 * True when the host theme actually carries usable glass tokens.
 *
 * `enabled: false` counts as absent. The app's own factory ships an inert token
 * object in plain mode, and treating that as "glass is available" would produce
 * a translucent surface with no blur behind it.
 */
export function hasGlassTokens(theme: unknown): boolean {
  if (!isRecord(theme)) return false;
  const glass = theme.glass;
  if (!isRecord(glass)) return false;
  if (glass.enabled === false) return false;
  return typeof glass.surface === 'string' && typeof glass.border === 'string';
}

export function resolveColorMode(theme: unknown): ColorMode {
  if (!isRecord(theme)) return 'light';
  const palette = theme.palette;
  return isRecord(palette) && palette.mode === 'dark' ? 'dark' : 'light';
}

/**
 * What the caller asked for, reduced to what this theme can deliver.
 *
 * The fallback matrix, in one place:
 *
 * | requested       | glass tokens | resolves to    |
 * | --------------- | ------------ | -------------- |
 * | inherit         | absent       | plain          |
 * | inherit         | present      | the app's style|
 * | gradientGlass   | absent       | plain          |
 * | glass3d         | absent       | plain          |
 * | mesh            | absent       | **mesh**       |
 * | animated        | absent       | **animated**   |
 *
 * `mesh` and `animated` survive because they are built from plain CSS
 * gradients and keyframes; they never needed the glass tokens.
 */
export function resolveAppearance(
  requested: DomainAppearance,
  theme: unknown,
): ResolvedAppearance {
  const glass = hasGlassTokens(theme);

  if (requested === 'inherit') {
    if (!glass) return 'plain';
    const style = resolveAppStyle(theme);
    return style === 'glass3d' ? 'glass3d' : style === 'glass' ? 'gradientGlass' : 'plain';
  }

  if ((requested === 'gradientGlass' || requested === 'glass3d') && !glass) return 'plain';

  return requested;
}

/* ------------------------------------------------------------------ */
/* Token computation                                                   */
/* ------------------------------------------------------------------ */

/** CSS custom properties written onto the scope boundary. */
export interface DomainCssVars {
  readonly '--domain-hue': string;
  readonly '--domain-surface': string;
  readonly '--domain-border': string;
  readonly '--domain-gradient': string;
  readonly '--domain-shadow': string;
  readonly '--domain-highlight': string;
  readonly '--domain-mesh': string;
  /** The domain's motif, as an inline SVG `url()`. Painted over the mesh. */
  readonly '--domain-motif': string;
}

export interface DomainTokens {
  readonly appearance: ResolvedAppearance;
  readonly mode: ColorMode;
  readonly visuals: DomainVisualConfig;
  readonly motif: MotifId;
  readonly vars: DomainCssVars;
  /** Whether the 3D lift applies. False under reduced motion, decided at render. */
  readonly interactive: boolean;
}

/**
 * Surface and border opacity, per mode.
 *
 * Dark mode needs more of the hue to read as a tint at all; light mode needs
 * far less before text contrast starts to suffer. These two numbers are the
 * whole reason the resolver takes a mode.
 */
const SURFACE_ALPHA: Record<ColorMode, number> = { light: 0.06, dark: 0.14 };
const BORDER_ALPHA = 0.38;

function buildVars(hue: string, mode: ColorMode, motif: MotifId): DomainCssVars {
  const strong = mode === 'dark' ? 0.5 : 0.45;

  return {
    '--domain-hue': hue,
    '--domain-surface': withAlpha(hue, SURFACE_ALPHA[mode]),
    '--domain-border': withAlpha(hue, BORDER_ALPHA),
    // Composed *over* the host's glass surface by the stylesheet, never instead
    // of it — which is why this is a gradient and not a flat colour.
    '--domain-gradient': `linear-gradient(135deg, ${withAlpha(hue, strong)} 0%, ${withAlpha(hue, 0.08)} 100%)`,
    // Tinted depth, added to the theme's own shadow rather than replacing it.
    '--domain-shadow': `0 18px 48px ${withAlpha(hue, mode === 'dark' ? 0.4 : 0.24)}`,
    // The specular highlight for glass3d's ::before.
    '--domain-highlight': `radial-gradient(120% 80% at 20% 0%, ${withAlpha(hue, 0.28)} 0%, transparent 60%)`,
    // Three layered radial gradients: a "mesh" background with no image, no
    // request and no layout shift.
    '--domain-mesh': [
      `radial-gradient(at 12% 18%, ${withAlpha(hue, mode === 'dark' ? 0.34 : 0.28)} 0px, transparent 55%)`,
      `radial-gradient(at 86% 12%, ${withAlpha(hue, mode === 'dark' ? 0.22 : 0.18)} 0px, transparent 50%)`,
      `radial-gradient(at 60% 92%, ${withAlpha(hue, mode === 'dark' ? 0.18 : 0.14)} 0px, transparent 45%)`,
    ].join(', '),
    // The domain's own artwork, inlined. Fainter in dark mode, where a line
    // drawing at the same opacity reads as a scratch on the surface.
    '--domain-motif': motifBackgroundImage(motif, hue, mode === 'dark' ? 0.22 : 0.16),
  };
}

/**
 * Memoised by `hue:mode`.
 *
 * The strings above are identical for every card in a list, so they are
 * computed once per combination for the life of the process. This is what keeps
 * the scope boundary from doing string work on every render.
 */
const varsCache = new Map<string, DomainCssVars>();

function cachedVars(hue: string, mode: ColorMode, motif: MotifId): DomainCssVars {
  // The motif is part of the key: two domains can share a hue and still draw
  // different artwork, and keying on the hue alone would hand the second one
  // the first one's picture.
  const key = `${hue}:${mode}:${motif}`;
  const hit = varsCache.get(key);
  if (hit !== undefined) return hit;
  const built = buildVars(hue, mode, motif);
  varsCache.set(key, built);
  return built;
}

export interface ResolveDomainTokensInput {
  readonly domain?: string;
  /** Explicit override; wins over the registry. */
  readonly visuals?: Partial<DomainVisualConfig>;
  readonly appearance?: DomainAppearance;
  /** The host MUI theme. Read defensively — may be anything, including undefined. */
  readonly theme?: unknown;
  /** Overrides the mode read off the theme. Mostly for tests and previews. */
  readonly mode?: ColorMode;
}

/** The one function the provider calls. Pure, and safe with no theme at all. */
export function resolveDomainTokens({
  domain,
  visuals,
  appearance = 'inherit',
  theme,
  mode,
}: ResolveDomainTokensInput): DomainTokens {
  const resolvedVisuals = resolveDomainVisuals(domain, visuals);
  const resolvedMode = mode ?? resolveColorMode(theme);
  const resolvedAppearance = resolveAppearance(appearance, theme);

  return {
    appearance: resolvedAppearance,
    mode: resolvedMode,
    visuals: resolvedVisuals,
    motif: resolvedVisuals.motif,
    vars: cachedVars(resolvedVisuals.hue, resolvedMode, resolvedVisuals.motif),
    // Only glass3d lifts. Reduced motion is applied in CSS, where the media
    // query belongs — a JS-side check would miss a user changing it live.
    interactive: resolvedAppearance === 'glass3d',
  };
}

/** Test seam. Never called by the library itself. */
export function __clearDomainTokenCache(): void {
  varsCache.clear();
}
