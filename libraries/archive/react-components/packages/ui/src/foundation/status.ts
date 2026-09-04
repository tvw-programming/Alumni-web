import type { ChipProps } from '@mui/material/Chip';

/**
 * The one place a domain status becomes a colour *and* a word.
 *
 * Every status chip in this library goes through here, so no component can
 * accidentally ship a state that is distinguishable only by hue. The `label` is
 * mandatory; the `color` is decoration on top of it.
 */
export interface StatusPresentation {
  readonly label: string;
  readonly color: ChipProps['color'];
  /** Longer wording for a screen reader, when the chip text is abbreviated. */
  readonly description?: string;
}

export type StatusMap<T extends string> = Readonly<Record<T, StatusPresentation>>;

export function statusOf<T extends string>(
  map: StatusMap<T>,
  value: T | undefined,
  fallback: StatusPresentation = { label: 'Unknown', color: 'default' },
): StatusPresentation {
  return value === undefined ? fallback : (map[value] ?? fallback);
}
