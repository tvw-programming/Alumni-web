/**
 * The one stylesheet domain theming installs.
 *
 * Every value here is a CSS custom property, so these rules are **completely
 * static** — they do not depend on the theme, the mode, or which domain is in
 * scope. That is what lets them be injected once for the whole application
 * instead of once per boundary, and it is the reason this approach costs
 * nothing per render.
 *
 * Scoping rules, in order of importance:
 *
 * 1. `.MuiCard-root` is matched as a **descendant**, so a component that nests
 *    its card still gets styled.
 * 2. `.MuiPaper-root` is matched as a **direct child only**. Paper backs menus,
 *    popovers, drawers, dialogs and autocompletes; a descendant match would tint
 *    every one of them.
 * 3. List rows get their own selector, because they are not Paper and would
 *    otherwise receive nothing.
 * 4. The 3D lift is applied to card-like surfaces only. A list row that tilts
 *    on hover looks broken.
 */

const SCOPE = '.idol-domain-scope';

/** Applied by `DomainSurface` to components that render no themed surface. */
export const DOMAIN_SURFACE_CLASS = 'idol-domain-surface';
export const DOMAIN_SCOPE_CLASS = 'idol-domain-scope';
export const DOMAIN_APPEARANCE_ATTR = 'data-domain-appearance';

/** Card-like surfaces: the things that may be tinted, lifted and gradient-filled. */
function surfaces(appearance: string): string {
  return [
    `${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='${appearance}'] .MuiCard-root`,
    // Direct child only — see rule 2 above.
    `${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='${appearance}'] > .MuiPaper-root`,
    `${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='${appearance}'] > .${DOMAIN_SURFACE_CLASS}`,
    `${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='${appearance}'] .${DOMAIN_SURFACE_CLASS}`,
  ].join(',\n');
}

/** Rows: tinted and bordered, never lifted. */
function rows(appearance: string): string {
  return [
    `${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='${appearance}'] .MuiListItemButton-root`,
    `${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='${appearance}'] .MuiListItem-root`,
  ].join(',\n');
}

/**
 * The complete rule set.
 *
 * Written as a string rather than an object so the scoping is readable at a
 * glance — this file's whole job is being auditable.
 */
export const DOMAIN_GLOBAL_CSS = `
/* The boundary itself never paints and never affects layout. */
${SCOPE} { display: contents; }
${SCOPE}[data-domain-layout='block'] { display: block; }

/*
 * The wrapper's own defaults live here, not in a style attribute.
 *
 * DomainSurface used to set a "1px solid transparent" border inline to reserve
 * the layout. Inline styles outrank the sheet, so the scoped border-color rules
 * below could never take effect: every wrapped component rendered an invisible
 * border while the cards beside it showed the domain colour. Declaring the
 * width and style here -- and only the colour in the scoped rules -- keeps the
 * reserved space without winning the cascade.
 *
 * The padding is here for the same reason. A tinted, bordered surface with its
 * content flush against the edge does not read as a surface -- it reads as a
 * stray coloured slab behind the component. Tier A components get this spacing
 * from the Card they already render; the wrapped ones have nothing, so it is
 * declared once here. Keeping it in the base rule rather than the scoped ones
 * also means switching appearance never shifts the layout.
 *
 * No backticks in this comment: the whole stylesheet is one template literal,
 * and a stray backtick ends it mid-file.
 */
.${DOMAIN_SURFACE_CLASS} {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 12px;
}

/* ---------------------------------------------------------------- plain -- */
${surfaces('plain')} {
  background-color: var(--domain-surface);
  border-color: var(--domain-border);
}
${rows('plain')} {
  border-left: 3px solid var(--domain-border);
}

/* -------------------------------------------------------- gradientGlass -- */
/*
 * background-IMAGE, not background-color: it composes over whatever surface
 * colour the host theme already set, rather than replacing it.
 *
 * There is deliberately no backdrop-filter here. The host theme already applies
 * one globally in its glass styles, and a second blurred layer over the first is
 * the usual cause of scroll jank.
 */
${surfaces('gradientGlass')} {
  background-image: var(--domain-gradient);
  border-color: var(--domain-border);
}
${rows('gradientGlass')} {
  background-image: var(--domain-gradient);
  border-left: 3px solid var(--domain-border);
}

/* --------------------------------------------------------------- glass3d -- */
${surfaces('glass3d')} {
  background-image: var(--domain-gradient);
  border-color: var(--domain-border);
  box-shadow: var(--domain-shadow);
  position: relative;
  transform-style: preserve-3d;
  transition: transform 220ms ease, box-shadow 220ms ease;
}

/* The specular highlight. Non-interactive so it cannot eat a click. */
${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] .MuiCard-root::before,
${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] > .${DOMAIN_SURFACE_CLASS}::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--domain-highlight);
  pointer-events: none;
  border-radius: inherit;
}

/*
 * The same transform the host theme's own 3D style uses. Stated identically on
 * purpose: if the two ever drift, cards would jump when the domain scope is
 * toggled.
 */
${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] .MuiCard-root:hover,
${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] > .${DOMAIN_SURFACE_CLASS}:hover {
  transform: translateY(-6px) rotateX(4deg) rotateY(-4deg);
}

/* Rows are tinted but never lifted. */
${rows('glass3d')} {
  background-image: var(--domain-gradient);
  border-left: 3px solid var(--domain-border);
}

/* ------------------------------------------------------------------ mesh -- */
/*
 * The motif sits over the mesh, bottom-right, at a size that reads as a
 * watermark rather than as content. Two layers in one property, so the order in
 * every list below is: artwork first, mesh second.
 *
 * Bottom-right rather than top-right because that is where MUI does not put
 * things: a card's header, its overflow menu and its primary action all sit
 * along the top edge, and the artwork drawn there looked like a rendering fault
 * rather than a watermark.
 *
 * Deliberately not a child element: a decorative image that is part of the
 * background cannot be selected, cannot take a tab stop, and is invisible to a
 * screen reader without anyone having to remember an aria-hidden.
 */
${surfaces('mesh')} {
  background-image: var(--domain-motif), var(--domain-mesh);
  background-repeat: no-repeat, no-repeat;
  background-position: right 14px bottom 14px, center;
  background-size: 68px 68px, cover;
  border-color: var(--domain-border);
}
${rows('mesh')} {
  border-left: 3px solid var(--domain-border);
}

/* -------------------------------------------------------------- animated -- */
/*
 * The same artwork, drifting. This used to be a copy of the mesh rules under a
 * different name -- identical output, so the picker offered two buttons that
 * did the same thing. The motion is on background-position, which the
 * compositor handles without touching layout, and it stops entirely under
 * reduced motion.
 */
${surfaces('animated')} {
  background-image: var(--domain-motif), var(--domain-mesh);
  background-repeat: no-repeat, no-repeat;
  background-position: right 14px bottom 14px, center;
  background-size: 68px 68px, cover;
  border-color: var(--domain-border);
  animation: idol-domain-drift-bg 9s ease-in-out infinite;
}
${rows('animated')} {
  border-left: 3px solid var(--domain-border);
}

/* ------------------------------------------------------------ keyframes -- */
/* Defined once, shared by every glyph. Never generated per instance. */
/* Drifts the motif layer only; the mesh underneath stays put. */
@keyframes idol-domain-drift-bg {
  0%, 100% { background-position: right 14px bottom 14px, center; }
  50%      { background-position: right 14px bottom 26px, center; }
}
@keyframes idol-domain-drift {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(0, -6px, 0); }
}
@keyframes idol-domain-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
@keyframes idol-domain-trace {
  from { stroke-dashoffset: 240; }
  to   { stroke-dashoffset: 0; }
}

/* ------------------------------------------------------- reduced motion -- */
/*
 * One block, covering the lift and every glyph animation together. A user who
 * asks for less motion gets the colour treatment and none of the movement.
 */
@media (prefers-reduced-motion: reduce) {
  ${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] .MuiCard-root,
  ${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] > .${DOMAIN_SURFACE_CLASS} {
    transition: none;
  }
  ${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] .MuiCard-root:hover,
  ${SCOPE}[${DOMAIN_APPEARANCE_ATTR}='glass3d'] > .${DOMAIN_SURFACE_CLASS}:hover {
    transform: none;
  }
  ${SCOPE} [class*='idol-domain-glyph'] * {
    animation: none !important;
  }
  /*
   * The drifting motif. Listed by the same selectors that start it, so the two
   * cannot fall out of step — a new animated surface added above without a stop
   * here would keep moving for someone who asked it not to.
   */
  ${surfaces('animated')} {
    animation: none;
  }
}
`;
