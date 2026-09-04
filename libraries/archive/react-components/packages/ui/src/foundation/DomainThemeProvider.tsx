import GlobalStyles from '@mui/material/GlobalStyles';
import { useTheme } from '@mui/material/styles';
import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';

import {
  DOMAIN_APPEARANCE_ATTR,
  DOMAIN_GLOBAL_CSS,
  DOMAIN_SCOPE_CLASS,
  DOMAIN_SURFACE_CLASS,
} from './domainStyles';
import { resolveDomainTokens, type DomainAppearance, type DomainTokens } from './domainTheme';

import type { DomainVisualConfig } from './domainVisuals';

/**
 * Layer 2 of domain theming: the scope boundary.
 *
 * The boundary is a `div` carrying a class, a data attribute and the resolved
 * CSS custom properties as inline style. **No MUI theme is created**, so there
 * is no theme object to rebuild, no descendant style recalculation and no
 * subtree re-render when a domain changes — only a handful of custom properties
 * change value, and the browser repaints the affected surfaces.
 *
 * The rules that read those properties live in one static stylesheet
 * (`domainStyles.ts`), injected once per application.
 */

interface DomainContextValue {
  readonly tokens: DomainTokens;
  readonly domain: string | undefined;
  readonly appearance: DomainAppearance;
  readonly visuals: Partial<DomainVisualConfig> | undefined;
  /** True once an ancestor has injected the stylesheet. */
  readonly stylesMounted: boolean;
}

const DomainContext = createContext<DomainContextValue | null>(null);

/**
 * The resolved tokens for the nearest scope.
 *
 * Returns a plain-appearance default outside any provider, so an unwrapped
 * component renders exactly as it does today rather than throwing. Every
 * consumer in this library is decoration; none of them may take a page down.
 */
export function useDomainTokens(): DomainTokens {
  const context = useContext(DomainContext);
  const theme = useTheme();
  const fallback = useMemo(
    () => resolveDomainTokens({ appearance: 'plain', theme }),
    [theme],
  );
  return context?.tokens ?? fallback;
}

/** The domain in scope, or `undefined` outside a provider. */
export function useDomainId(): string | undefined {
  return useContext(DomainContext)?.domain;
}

/**
 * The stylesheet.
 *
 * Exported so a host can hoist it to the application root explicitly. Providers
 * mount it themselves when no ancestor has, so hosting it is an optimisation
 * rather than a setup step someone can forget.
 */
export function DomainStyles() {
  return <GlobalStyles styles={DOMAIN_GLOBAL_CSS} />;
}

export interface DomainThemeProviderProps {
  /** Domain id. Unknown ids fall back to a neutral hue rather than throwing. */
  domain?: string;
  /** Default appearance for the subtree. `inherit` follows the host theme. */
  appearance?: DomainAppearance;
  /** Overrides the registry for this subtree — hue, motif, or both. */
  visuals?: Partial<DomainVisualConfig>;
  /**
   * `contents` (default) makes the boundary invisible to layout. `block` gives
   * it a real box, for the rare case where something needs to paint on it.
   */
  layout?: 'contents' | 'block';
  className?: string;
  children: ReactNode;
}

/**
 * Sets the domain and the default appearance for everything inside it.
 *
 * ```tsx
 * <DomainThemeProvider domain="fintech" appearance="gradientGlass">
 *   <BalanceCard />
 * </DomainThemeProvider>
 * ```
 *
 * Nesting is supported: an inner provider replaces the domain, while
 * `DomainAppearanceBoundary` changes only the appearance.
 */
export function DomainThemeProvider({
  domain,
  appearance = 'inherit',
  visuals,
  layout = 'contents',
  className,
  children,
}: DomainThemeProviderProps) {
  const theme = useTheme();
  const parent = useContext(DomainContext);

  const tokens = useMemo(
    () => resolveDomainTokens({ domain, visuals, appearance, theme }),
    [domain, visuals, appearance, theme],
  );

  const value = useMemo<DomainContextValue>(
    () => ({ tokens, domain, appearance, visuals, stylesMounted: true }),
    [tokens, domain, appearance, visuals],
  );

  return (
    <DomainContext.Provider value={value}>
      {/* Injected by the outermost provider only. Nested scopes reuse it. */}
      {parent?.stylesMounted === true ? null : <DomainStyles />}
      <div
        className={[DOMAIN_SCOPE_CLASS, className].filter(Boolean).join(' ')}
        data-domain={domain}
        data-domain-layout={layout}
        {...{ [DOMAIN_APPEARANCE_ATTR]: tokens.appearance }}
        style={tokens.vars as CSSProperties}
      >
        {children}
      </div>
    </DomainContext.Provider>
  );
}

export interface DomainAppearanceBoundaryProps {
  /** The appearance for this region. The domain is inherited. */
  appearance: DomainAppearance;
  layout?: 'contents' | 'block';
  className?: string;
  children: ReactNode;
}

/**
 * Changes the appearance for a nested region without changing the domain, and
 * without any component inside it needing a prop.
 *
 * This is the level that makes "components don't change" and "local control"
 * both true — they are different levels, not the same one.
 */
export function DomainAppearanceBoundary({
  appearance,
  layout = 'contents',
  className,
  children,
}: DomainAppearanceBoundaryProps) {
  const parent = useContext(DomainContext);

  return (
    <DomainThemeProvider
      domain={parent?.domain}
      visuals={parent?.visuals}
      appearance={appearance}
      layout={layout}
      className={className}
    >
      {children}
    </DomainThemeProvider>
  );
}

export interface DomainSurfaceProps {
  className?: string;
  children: ReactNode;
  /** Extra styles. Applied after the domain class so a caller can still win. */
  style?: CSSProperties;
}

/**
 * An explicit surface, for the components that render no themed surface of
 * their own.
 *
 * Roughly half the library renders a `Stack` or a `Box` at its root — nothing
 * the scoped selectors can reach. Wrapping such a component in this gives it a
 * paintable surface without editing it.
 */
export function DomainSurface({ className, children, style }: DomainSurfaceProps) {
  /*
   * The radius and the placeholder border come from the stylesheet, not from a
   * style attribute. An inline `border` shorthand outranks the scoped
   * `border-color` rule, which left every wrapped component with an invisible
   * border while the cards beside it showed the domain colour.
   */
  return (
    <div className={[DOMAIN_SURFACE_CLASS, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}
