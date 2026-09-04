/**
 * The per-domain artwork, as inline SVG.
 *
 * "Lightweight image background" taken literally would mean a raster file per
 * domain: ten more network requests, ten more things to cache-bust, and a
 * decode on every card. These are line drawings a few hundred bytes each,
 * inlined as `data:` URIs into a CSS custom property — so they cost one request
 * *less* than an image, scale to any size, and take the domain's own colour
 * rather than shipping ten recoloured copies.
 *
 * Every path is drawn on a 64×64 canvas with `stroke` only and no fill, so the
 * same markup reads correctly on light and dark surfaces once the colour is
 * substituted.
 *
 * Zero imports on purpose: this file is pure data and string work, so it can be
 * unit-tested without MUI, React or a DOM.
 */

import type { MotifId } from './domainVisuals';

/** The drawing for each motif: the inside of an `<svg viewBox="0 0 64 64">`. */
const MOTIF_PATHS: Record<MotifId, string> = {
  // A shopping bag.
  bag: '<path d="M14 22h36l-4 30H18z"/><path d="M24 22v-6a8 8 0 0 1 16 0v6"/>',
  // A rising bar chart.
  chart: '<path d="M12 52h40"/><path d="M20 52V34"/><path d="M32 52V22"/><path d="M44 52V28"/>',
  // A heartbeat trace.
  pulse: '<path d="M8 32h12l6-14 8 28 6-14h16"/>',
  // A speech bubble.
  chat: '<path d="M12 18h40v26H30l-12 10V44h-6z"/>',
  // A dashboard grid.
  grid: '<path d="M12 12h18v18H12z"/><path d="M34 12h18v18H34z"/><path d="M12 34h18v18H12z"/><path d="M34 34h18v18H34z"/>',
  // A kanban board: three columns, one card raised.
  board: '<path d="M10 12h44v40H10z"/><path d="M24 12v40"/><path d="M40 12v40"/><path d="M14 20h6v10h-6z"/>',
  // Broadcast arcs over a point.
  signal: '<circle cx="32" cy="44" r="4"/><path d="M20 36a17 17 0 0 1 24 0"/><path d="M13 28a27 27 0 0 1 38 0"/>',
  // A route between two pins.
  route: '<circle cx="16" cy="20" r="5"/><circle cx="48" cy="44" r="5"/><path d="M16 25v10a9 9 0 0 0 9 9h14"/>',
  // A play triangle in a rounded frame.
  play: '<path d="M10 16h44v32H10z"/><path d="M28 24l14 8-14 8z"/>',
  // Closed activity rings.
  ring: '<circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="10"/>',
};

/**
 * The motif as a `url("data:image/svg+xml,...")` value, coloured for a domain.
 *
 * Percent-encoded rather than base64: the payload is markup, so the encoded
 * form stays readable in devtools and is *shorter* than base64 for this kind of
 * text. Only the characters that actually break a CSS `url()` are escaped.
 */
export function motifBackgroundImage(motif: MotifId, color: string, opacity: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" ` +
    `stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ` +
    `opacity="${String(opacity)}">${MOTIF_PATHS[motif]}</svg>`;

  return `url("data:image/svg+xml,${encodeSvg(svg)}")`;
}

/**
 * The minimum escaping a `data:` URI in CSS needs.
 *
 * `encodeURIComponent` would work but triples the length by escaping every
 * space, slash and angle bracket. These five characters are the ones that
 * actually terminate the value or confuse a parser.
 */
function encodeSvg(svg: string): string {
  return svg
    .replace(/%/g, '%25')
    .replace(/"/g, "'")
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');
}

/** Every motif the table can draw. Used by tests to check for gaps. */
export function motifIds(): MotifId[] {
  return Object.keys(MOTIF_PATHS) as MotifId[];
}

/* ------------------------------------------------------ sample imagery -- */

/**
 * Stand-in artwork for the component demos, one set per domain.
 *
 * Twelve components used to load photographs from Unsplash. Realistic, but it
 * made a component gallery depend on a third-party CDN: offline, behind a
 * proxy, or under any `img-src` policy that does not name that host, a dozen
 * demos rendered broken images and it looked like the components were at fault.
 *
 * These are generated instead — a domain-coloured gradient with the domain's
 * own motif over it. Not photographs, and not pretending to be: the job of a
 * sample image here is to occupy the right shape in the right colour so the
 * component's layout can be judged.
 *
 * It lives in this file, beside the drawings it reuses, because the file has no
 * value imports — only an erased type import. That is what lets the build
 * script load it in plain Node while the app loads it through Vite.
 */

/** How many distinct images each domain gets. */
export const SAMPLE_VARIANTS = 3;

/**
 * Three arrangements, so a carousel of five posters does not show one picture
 * five times. Angles and focal points only — the colour stays the domain's.
 */
const ARRANGEMENTS = [
  { angle: 135, fx: '22%', fy: '18%', scale: 5.0, rotate: -8 },
  { angle: 215, fx: '74%', fy: '30%', scale: 6.1, rotate: 6 },
  { angle: 95, fx: '48%', fy: '76%', scale: 4.3, rotate: -3 },
];

/**
 * One sample image, as a standalone SVG document.
 *
 * `preserveAspectRatio="slice"` so a single square drawing fills a poster, a
 * backdrop or an avatar without distortion — which is why there is no separate
 * file per aspect ratio.
 *
 * `variant` is taken modulo the number of arrangements, so a caller can pass a
 * plain index without knowing how many exist.
 */
export function sampleImageSvg(motif: MotifId, hue: string, variant = 0): string {
  const arrangement = ARRANGEMENTS[Math.abs(variant) % ARRANGEMENTS.length];
  const id = `s${String(Math.abs(variant) % ARRANGEMENTS.length)}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800"` +
    ` preserveAspectRatio="xMidYMid slice" role="img">` +
    `<defs>` +
    `<linearGradient id="${id}" gradientTransform="rotate(${String(arrangement.angle)} 0.5 0.5)">` +
    `<stop offset="0%" stop-color="${hue}" stop-opacity="0.95"/>` +
    `<stop offset="55%" stop-color="${hue}" stop-opacity="0.6"/>` +
    `<stop offset="100%" stop-color="${hue}" stop-opacity="0.28"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}h" cx="${arrangement.fx}" cy="${arrangement.fy}" r="70%">` +
    `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>` +
    `<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="800" height="800" fill="url(#${id})"/>` +
    `<rect width="800" height="800" fill="url(#${id}h)"/>` +
    // The motif, large and faint: enough to say which domain this is without
    // competing with whatever the component draws on top.
    `<g transform="translate(400 400) rotate(${String(arrangement.rotate)}) scale(${String(
      arrangement.scale,
    )}) translate(-32 -32)" fill="none" stroke="#ffffff" stroke-opacity="0.5"` +
    ` stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
    MOTIF_PATHS[motif] +
    `</g>` +
    `</svg>`
  );
}

/** Where the gallery serves a domain's sample image from. */
export function sampleImagePath(domain: string, variant = 0): string {
  return `/domain-components/_samples/${domain}-${String(Math.abs(variant) % SAMPLE_VARIANTS)}.svg`;
}
