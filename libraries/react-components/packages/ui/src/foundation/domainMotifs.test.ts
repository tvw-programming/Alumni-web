import { describe, expect, it } from 'vitest';

import { motifBackgroundImage, motifIds } from './domainMotifs';
import { DOMAIN_VISUALS, resolveDomainVisuals } from './domainVisuals';

describe('motifBackgroundImage', () => {
  it('produces a CSS url() a browser will accept', () => {
    const value = motifBackgroundImage('bag', '#7c63ff', 0.16);
    expect(value.startsWith('url("data:image/svg+xml,')).toBe(true);
    expect(value.endsWith('")')).toBe(true);
  });

  it('escapes the characters that would break the value', () => {
    const value = motifBackgroundImage('chart', '#18c2c2', 0.16);
    // A raw `#` ends a URL fragment and a raw `<`/`>` confuses the parser. The
    // double quotes wrapping the value must not appear inside it either.
    expect(value).toContain('%23');
    expect(value.slice('url("'.length, -'")'.length)).not.toContain('"');
    expect(value).not.toContain('<svg');
  });

  it('carries the domain colour and opacity through', () => {
    const value = motifBackgroundImage('pulse', '#ff5fa2', 0.22);
    expect(value).toContain('%23ff5fa2');
    expect(value).toContain('opacity=');
    expect(value).toContain('0.22');
  });

  it('draws something different for each motif', () => {
    // A copy-paste in the table would silently give two domains one picture.
    const drawings = motifIds().map((motif) => motifBackgroundImage(motif, '#000000', 1));
    expect(new Set(drawings).size).toBe(drawings.length);
  });

  it('stays small enough to be worth inlining', () => {
    // The case for inline SVG over an image file is size. If a motif grows past
    // a kilobyte, that argument is gone and it should be a real asset.
    for (const motif of motifIds()) {
      expect(motifBackgroundImage(motif, '#000000', 1).length).toBeLessThan(1024);
    }
  });

  it('has a drawing for every motif a domain asks for', () => {
    // The gap this catches: adding a domain with a new motif name and no path.
    const drawn = new Set(motifIds());
    const asked = Object.values(DOMAIN_VISUALS).map((visual) => visual.motif);
    expect(asked.filter((motif) => !drawn.has(motif))).toEqual([]);
  });

  it('gives every domain in the registry its own artwork', () => {
    const perDomain = Object.values(DOMAIN_VISUALS).map((visual) =>
      motifBackgroundImage(visual.motif, visual.hue, 0.16),
    );
    expect(new Set(perDomain).size).toBe(perDomain.length);
  });
});

describe('resolveDomainVisuals overrides', () => {
  it('carries every field through an override, not just the ones named', () => {
    /*
     * The bug this replaces: the merge listed `hue` and `motif` by hand, so
     * `icon` vanished the day it was added and every override rendered the
     * fallback icon. Asserting on key *count* rather than on the fields known
     * today is what makes this catch the next one too.
     */
    const base = resolveDomainVisuals('ecommerce');
    const overridden = resolveDomainVisuals('ecommerce', { hue: '#123456' });

    expect(Object.keys(overridden).sort()).toEqual(Object.keys(base).sort());
    expect(overridden.hue).toBe('#123456');
    expect(overridden.motif).toBe(base.motif);
    expect(overridden.icon).toBe(base.icon);
  });

  it('ignores an override field explicitly set to undefined', () => {
    const overridden = resolveDomainVisuals('media', { hue: undefined });
    expect(overridden.hue).toBe(resolveDomainVisuals('media').hue);
  });
});
