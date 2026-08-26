import { describe, expect, it, vi } from 'vitest';

import { MASTER_DATA_NAV, masterDataPath } from '@/routes/navigation';

import { matchCommand } from './commandMatcher';
import { ordinalPhrases, SIDEBAR_NOUNS } from './ordinals';
import { navCommandsFor } from './useNavigationCommands';

const navigate = vi.fn();

/** Exactly what `useMasterDataCommands` registers, built from the real sidebar. */
const sidebarCommands = navCommandsFor(MASTER_DATA_NAV, 'Master Data', masterDataPath, navigate, {
  ordinalNouns: SIDEBAR_NOUNS,
});

function resolve(spoken: string): string | null {
  return matchCommand(spoken, sidebarCommands)?.command.id ?? null;
}

const secondItem = `nav:${masterDataPath(MASTER_DATA_NAV[1])}`;
const firstItem = `nav:${masterDataPath(MASTER_DATA_NAV[0])}`;
const thirteenthItem = `nav:${masterDataPath(MASTER_DATA_NAV[12])}`;

/**
 * Looked up by label, not by index.
 *
 * The sidebar grows, and a test that pins "Error Log" to position 13 fails the
 * next time an entry is added — reporting a broken speech layer when nothing
 * about speech changed.
 */
function byLabel(label: string): string {
  const item = MASTER_DATA_NAV.find((entry) => entry.label === label);
  if (!item) throw new Error(`No sidebar entry labelled "${label}"`);
  return `nav:${masterDataPath(item)}`;
}

describe('ordinalPhrases', () => {
  it('builds ordinal-led, noun-led, word and digit forms', () => {
    const phrases = ordinalPhrases(1, ['menu']);
    expect(phrases).toEqual(['second menu', '2nd menu', 'menu two', 'menu 2', 'second']);
  });

  it('uses the right digit-ordinal suffix, including the teens', () => {
    expect(ordinalPhrases(0, ['menu'])).toContain('1st menu');
    expect(ordinalPhrases(2, ['menu'])).toContain('3rd menu');
    expect(ordinalPhrases(3, ['menu'])).toContain('4th menu');
    expect(ordinalPhrases(10, ['menu'])).toContain('11th menu');
    expect(ordinalPhrases(12, ['menu'])).toContain('13th menu');
  });

  it('stops past the twentieth entry rather than emitting noise', () => {
    expect(ordinalPhrases(20, ['menu'])).toEqual([]);
  });
});

describe('sidebar ordinal navigation', () => {
  it.each([
    'open second menu',
    'open the second menu',
    'second menu',
    'open second menu item',
    'open second sidebar button',
    'go to the second item',
    'open menu two',
    'open menu 2',
    'open 2nd menu',
    'second',
  ])('routes "%s" to the second sidebar entry', (spoken) => {
    expect(resolve(spoken)).toBe(secondItem);
  });

  it('routes the first and last entries by position', () => {
    expect(resolve('open first menu')).toBe(firstItem);
    expect(resolve('open the thirteenth menu')).toBe(thirteenthItem);
    expect(resolve('open menu 13')).toBe(thirteenthItem);
  });

  it('does not confuse adjacent ordinals', () => {
    // The risk with generated near-duplicates: "second menu" and "third menu"
    // are similar strings, so an exact hit has to win before fuzzy matching.
    expect(resolve('second menu')).toBe(secondItem);
    expect(resolve('third menu')).toBe(`nav:${masterDataPath(MASTER_DATA_NAV[2])}`);
    expect(resolve('fourth menu')).toBe(`nav:${masterDataPath(MASTER_DATA_NAV[3])}`);
    expect(resolve('menu 7')).toBe(`nav:${masterDataPath(MASTER_DATA_NAV[6])}`);
  });

  it('still prefers a name over a position', () => {
    // "Manage User" is the third entry; asking for it by name must not be
    // hijacked by any positional phrase.
    expect(resolve('manage user')).toBe(byLabel('Manage User'));
    expect(resolve('go to error log')).toBe(byLabel('Error Log'));
    expect(resolve('generic chart')).toBe(byLabel('Generic Chart'));
  });

  it('navigates to the right path when the command runs', () => {
    navigate.mockClear();
    matchCommand('open second menu', sidebarCommands)?.command.run();
    expect(navigate).toHaveBeenCalledWith('/admin/master-data/products-inline');
  });

  it('renumbers itself when the sidebar changes order', () => {
    const reordered = navCommandsFor(
      [...MASTER_DATA_NAV].reverse(),
      'Master Data',
      masterDataPath,
      navigate,
      { ordinalNouns: SIDEBAR_NOUNS },
    );
    // Second from the end of the real list, whatever its length.
    expect(matchCommand('open second menu', reordered)?.command.id).toBe(
      `nav:${masterDataPath(MASTER_DATA_NAV[MASTER_DATA_NAV.length - 2])}`,
    );
  });
});
