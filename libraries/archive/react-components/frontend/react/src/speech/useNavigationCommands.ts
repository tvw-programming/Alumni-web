import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { masterDataPath, type NavItem } from '@/routes/navigation';

import { ordinalPhrases, SIDEBAR_NOUNS } from './ordinals';
import { useSpeechCommands } from './useSpeechCommands';

import type { SpeechCommand } from './commandMatcher';

/**
 * Turns nav metadata into voice commands.
 *
 * One item becomes one command whose phrases are its label plus its aliases;
 * "go to", "open" and friends are stripped by the matcher, so none of that has
 * to be enumerated here. Because this reads the same arrays the layouts render,
 * a link and its voice command cannot drift apart.
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

/** Registers the top-level nav of whichever shell is mounted. */
export function useNavigationCommands(items: readonly NavItem[], group: string): void {
  const navigate = useNavigate();

  const commands = useMemo(
    () =>
      navCommandsFor(
        items,
        group,
        (item) => item.to,
        (path) => void navigate(path),
      ),
    [items, group, navigate],
  );

  useSpeechCommands(commands);
}

/**
 * Registers the master-data sidebar, whose paths are relative to the section.
 *
 * This is the one list that also answers to position ("open the second menu").
 * It is long, visibly ordered on screen, and several of its labels are awkward
 * to say — "Manage Product (inline edit)" — so counting is often the quickest
 * way in. No other registered list uses ordinals, so there is nothing to
 * collide with.
 */
export function useMasterDataCommands(items: readonly NavItem[]): void {
  const navigate = useNavigate();

  const commands = useMemo(
    () =>
      navCommandsFor(items, 'Master Data', masterDataPath, (path) => void navigate(path), {
        ordinalNouns: SIDEBAR_NOUNS,
      }),
    [items, navigate],
  );

  useSpeechCommands(commands);
}
