import { masterDataPath } from '../../layout/navigation';
import { ordinalPhrases, SIDEBAR_NOUNS } from './ordinals';

import type { NavItem } from '../../layout/navigation';
import type { SpeechCommand } from './command-matcher';

/**
 * Turns nav metadata into voice commands.
 *
 * One item becomes one command whose phrases are its label plus its aliases;
 * "go to", "open" and friends are stripped by the matcher, so none of that has
 * to be enumerated here. Because this reads the same arrays the layouts render,
 * a link and its voice command cannot drift apart.
 *
 * Ported verbatim from React's `navCommandsFor` — it was already free of both
 * React and the router.
 */
export interface NavCommandOptions {
  /**
   * Nouns to build positional phrases from ("second menu", "menu 2"). Omit for
   * lists where position is not how people refer to entries.
   *
   * Only one registered list should use ordinals at a time: two lists both
   * answering to "second menu" would resolve by registration order, which is
   * not something a user can predict.
   */
  ordinalNouns?: readonly string[];
}

export function navCommandsFor(
  items: readonly NavItem[],
  group: string,
  resolvePath: (item: NavItem) => string,
  navigate: (path: string) => void,
  options: NavCommandOptions = {},
): SpeechCommand[] {
  return items.map((item, index) => ({
    id: `nav:${resolvePath(item)}`,
    phrases: [
      item.label,
      ...(item.aliases ?? []),
      // Positional phrases come last so the label and its aliases are tried
      // first — a named request should never resolve by position.
      ...(options.ordinalNouns ? ordinalPhrases(index, options.ordinalNouns) : []),
    ],
    group,
    run: () => {
      navigate(resolvePath(item));
    },
  }));
}

/**
 * Commands for the master-data sidebar, whose paths are relative to the section.
 *
 * This is the one list that also answers to position ("open the second menu").
 * It is long, visibly ordered on screen, and several labels are awkward to say
 * — "Manage Product (inline edit)" — so counting is often the quickest way in.
 * No other registered list uses ordinals, so there is nothing to collide with.
 */
export function masterDataCommands(
  items: readonly NavItem[],
  navigate: (path: string) => void,
): SpeechCommand[] {
  return navCommandsFor(items, 'Master Data', masterDataPath, navigate, {
    ordinalNouns: SIDEBAR_NOUNS,
  });
}
