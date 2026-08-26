/**
 * Positional phrasings for list-shaped navigation.
 *
 * People refer to a menu by position as readily as by name — "open the second
 * menu" is a normal thing to say, and it is often faster than recalling that
 * the entry is called "Manage Product (inline edit)". Labels alone cannot serve
 * that, so each item also answers to its index.
 *
 * Generated rather than hand-written: 13 sidebar entries × several phrasings is
 * a list nobody would keep correct by hand, and it must renumber itself when an
 * entry is added or moved.
 */

const ORDINAL_WORDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
  'twentieth',
] as const;

const NUMBER_WORDS = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
] as const;

/**
 * Nouns a speaker might use for a sidebar entry.
 *
 * Kept deliberately short: every noun multiplies the phrase count, and each
 * near-duplicate ("second menu" vs "second item") is another chance for a fuzzy
 * mismatch. These four cover how the sidebar actually gets described.
 */
export const SIDEBAR_NOUNS = ['menu', 'menu item', 'sidebar button', 'item'] as const;

/** "1st", "2nd", "3rd", "4th" — recognizers often produce the digit form. */
function digitOrdinal(position: number): string {
  const lastTwo = position % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${String(position)}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[position % 10] ?? 'th';
  return `${String(position)}${suffix}`;
}

/**
 * Every positional phrase for a zero-based index.
 *
 * Returns an empty list past the twentieth entry: beyond that, nobody counts
 * menu items out loud, and the phrases would be noise in the matcher.
 */
export function ordinalPhrases(index: number, nouns: readonly string[]): string[] {
  const ordinal = ORDINAL_WORDS[index];
  const numberWord = NUMBER_WORDS[index];
  if (!ordinal) return [];

  const position = index + 1;
  const digits = String(position);
  const digitOrd = digitOrdinal(position);

  const phrases: string[] = [];
  for (const noun of nouns) {
    // "second menu", "2nd menu" — the ordinal leads.
    phrases.push(`${ordinal} ${noun}`, `${digitOrd} ${noun}`);
    // "menu two", "menu 2" — the noun leads.
    phrases.push(`${noun} ${numberWord}`, `${noun} ${digits}`);
  }
  // Bare "second", for when the context is obvious.
  phrases.push(ordinal);

  return phrases;
}
