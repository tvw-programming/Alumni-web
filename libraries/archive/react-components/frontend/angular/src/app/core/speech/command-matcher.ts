/**
 * Phrase → command matching.
 *
 * Deliberately pure and dependency-free: no React, no Web Speech API. Matching
 * is the part most likely to need tuning, and this way it is unit-testable
 * without a microphone, a browser, or a rendered tree.
 *
 * We do our own matching rather than handing an array to the library's
 * `commands` option because commands here are *derived from the nav metadata*
 * and change with the route. Registering a phrase must not re-render the
 * provider, so the library sees one static splat command and everything below
 * happens in a callback — see SpeechCMD.md.
 */

export interface SpeechCommand {
  /** Stable identity, used for de-duplication and for the help sheet. */
  id: string;
  /** Everything a user might say for this action. The first is shown in help. */
  phrases: readonly string[];
  /** Grouping label for the help sheet, e.g. "Navigation". */
  group: string;
  run: () => void;
}

export interface MatchResult {
  command: SpeechCommand;
  /** 1 for an exact phrase hit, otherwise the similarity that cleared the threshold. */
  score: number;
  matchedPhrase: string;
}

/**
 * Lead-ins people put in front of a destination. Stripped before matching so
 * "go to dashboard", "open the dashboard" and "dashboard" all land on one
 * command, and each phrase does not have to enumerate them.
 */
const LEAD_INS = [
  'please',
  'can you',
  'could you',
  'navigate to the',
  'navigate to',
  'take me to the',
  'take me to',
  'go to the',
  'go to',
  'show me the',
  'show me',
  'switch to the',
  'switch to',
  'open the',
  'open',
  'show',
  'goto',
];

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalize(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Removes a leading "go to"-style prefix, once. */
export function stripLeadIn(phrase: string): string {
  for (const leadIn of LEAD_INS) {
    if (phrase === leadIn) return '';
    if (phrase.startsWith(`${leadIn} `)) {
      return phrase.slice(leadIn.length + 1).trim();
    }
  }
  return phrase;
}

/**
 * Dice coefficient over character bigrams: 1 is identical, 0 shares nothing.
 *
 * Chosen over edit distance because speech recognition errors are usually whole
 * wrong words rather than single characters, and bigram overlap degrades more
 * gracefully there ("manage user" vs "manage users" stays high).
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const bigram = a.slice(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  let hits = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const bigram = b.slice(i, i + 2);
    const count = bigrams.get(bigram) ?? 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      hits += 1;
    }
  }

  return (2 * hits) / (a.length - 1 + (b.length - 1));
}

export interface MatchOptions {
  /**
   * Minimum similarity for a fuzzy hit. 0.72 was chosen empirically: high
   * enough that "dashboard" does not match "generic card", low enough to
   * absorb the plural/article noise recognition adds.
   */
  threshold?: number;
}

/**
 * Best command for a spoken phrase, or null when nothing clears the bar.
 *
 * Exact hits always beat fuzzy ones, so a phrase that *is* a command can never
 * be stolen by a longer command that happens to be similar.
 */
export function matchCommand(
  spoken: string,
  commands: readonly SpeechCommand[],
  options: MatchOptions = {},
): MatchResult | null {
  const threshold = options.threshold ?? 0.72;
  const normalized = normalize(spoken);
  if (!normalized) return null;

  // Try the phrase as spoken and with its lead-in removed; a command whose
  // phrase legitimately starts with "show" (e.g. "show help") must still match.
  const candidates = [normalized, stripLeadIn(normalized)].filter(
    (candidate, index, all) => candidate.length > 0 && all.indexOf(candidate) === index,
  );

  let best: MatchResult | null = null;

  for (const command of commands) {
    for (const rawPhrase of command.phrases) {
      const phrase = normalize(rawPhrase);
      for (const candidate of candidates) {
        if (candidate === phrase) {
          return { command, score: 1, matchedPhrase: rawPhrase };
        }
        const score = similarity(candidate, phrase);
        if (score >= threshold && (best === null || score > best.score)) {
          best = { command, score, matchedPhrase: rawPhrase };
        }
      }
    }
  }

  return best;
}
