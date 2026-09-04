/**
 * Which components domain theming can reach, and how.
 *
 * Domain theming paints through scoped CSS, so it can only match a surface the
 * component actually renders. Roughly a third of the library renders a `Stack`
 * or a `Box` at its root — nothing the selectors can see — and those need an
 * explicit `DomainSurface` wrapper instead.
 *
 * This classifier is the single source of that answer. The registry stamps it
 * onto every catalogue entry so the gallery knows which components to wrap, and
 * the coverage test asserts against the same function — one classifier, so the
 * test cannot pass while the gallery does something else.
 *
 * It reads source text rather than rendering. The question is structural, the
 * package has no DOM test environment, and source is what the registry already
 * has in hand.
 */

export type SurfaceTier =
  /** Renders a Card/Paper at its root — the scoped selector matches directly. */
  | 'surface-root'
  /** Renders a surface further down — the same selector matches as a descendant. */
  | 'surface-nested'
  /** A list row: reached by the row selector, never lifted. */
  | 'list-row'
  /** No surface at all. Needs an explicit `DomainSurface` wrapper. */
  | 'no-surface'
  /** Portals to `document.body`, escaping every boundary. Neutral by design. */
  | 'portal';

const SURFACE_ROOTS = new Set(['Card', 'Paper', 'GlassCard', 'Accordion']);
const PORTAL_ROOTS = new Set(['Dialog', 'Menu', 'Drawer', 'Popper', 'Modal', 'Popover']);
const SURFACE_ANYWHERE = /<(Card|Paper|GlassCard|Accordion)\b/;

/**
 * The JSX element a component returns.
 *
 * `<>` is matched explicitly: a fragment root is a real answer rather than an
 * unreadable one — it means there is no single root element to style, so
 * classification falls through to whatever is rendered inside.
 *
 * Returns `null` when the root cannot be determined, which callers treat as a
 * failure to classify rather than as a tier.
 */
export function rootElementOf(componentName: string, source: string): string | null {
  const exported = new RegExp(`export (?:const|function) ${componentName}\\b`).exec(source);
  const body = exported ? source.slice(exported.index) : source;
  const jsx = /return\s*\(\s*\n?\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)?<([A-Za-z][\w.]*|>)/.exec(body);
  if (jsx === null) return null;
  return jsx[1] === '>' ? 'Fragment' : jsx[1];
}

/**
 * How domain theming reaches this component.
 *
 * `null` when the root element could not be read — the coverage test fails on
 * that rather than letting it default to a tier, because a silent default is
 * exactly how a component ends up with no styling and nobody notices.
 */
export function classifySurface(componentName: string, source: string): SurfaceTier | null {
  const root = rootElementOf(componentName, source);
  if (root === null) return null;

  if (SURFACE_ROOTS.has(root)) return 'surface-root';
  if (PORTAL_ROOTS.has(root)) return 'portal';
  if (root.startsWith('ListItem')) return 'list-row';
  return SURFACE_ANYWHERE.test(source) ? 'surface-nested' : 'no-surface';
}

/**
 * Whether a host must wrap this component to give domain theming something to
 * paint. Only `no-surface` qualifies: wrapping a component that already renders
 * a Card would tint a box around an already-tinted card.
 */
export function needsDomainSurface(tier: SurfaceTier | null): boolean {
  return tier === 'no-surface';
}
