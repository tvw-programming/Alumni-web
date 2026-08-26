## Component Specification

### Name & Purpose

`SpeechProvider` — the voice command layer. Owns the recognition session, the
command registry and phrase matching.

### Location

`src/speech/` — `SpeechProvider.tsx`, `speechStore.ts`, `speechContext.ts`,
`commandMatcher.ts`, `ordinals.ts`, `useSpeechCommands.ts`,
`useNavigationCommands.ts`, `MicToggleButton.tsx`, `SpeechControls.tsx`,
`SpeechHelpDialog.tsx`

### Public Interface

```ts
export const INACTIVITY_TIMEOUT_MS = 3 * 60_000;

interface SpeechCommand {
  id: string;
  phrases: string[]; // label, aliases, then positional phrases
  group: string; // used by the help sheet
  run: () => void;
}

// commandMatcher.ts — framework-free, ported verbatim to Angular
export function normalize(phrase: string): string;
export function stripLeadIn(phrase: string): string;
export function similarity(a: string, b: string): number; // Dice, bigrams
export function matchCommand(
  spoken: string,
  commands: readonly SpeechCommand[],
  options?: MatchOptions,
): MatchResult | null;

// ordinals.ts
export const SIDEBAR_NOUNS = ['menu', 'menu item', 'sidebar button', 'item'] as const;
export function ordinalPhrases(index: number, nouns: readonly string[]): string[];

// hooks
export function useSpeechCommands(commands: SpeechCommand[]): void;
export function useNavigationCommands(items: readonly NavItem[], group: string): void;
export function useMasterDataCommands(items: readonly NavItem[]): void;
export function useSpeechSelector<T>(selector: (state: SpeechState) => T): T;
```

### Dependencies

- Internal: `routes/navigation`, `snackbarBus`, `utils/errorLogger`,
  `utils/monitoring`.
- External: `react-speech-recognition`.

### Data Models

```ts
type MicStatus = 'unsupported' | 'denied' | 'off' | 'starting' | 'listening';
interface SpeechState {
  status: MicStatus;
  lastHeard: string;
  lastMatched: string | null;
  lastFailed: boolean;
  lastActivityAt: number;
}
```

Preference key `app.speech.enabled` in `localStorage`.

### Business Rules & Constraints

**Matching** — Dice coefficient over character bigrams, threshold **0.72**.
Chosen over edit distance because recognition errors are usually whole wrong
words, and bigram overlap degrades more gracefully there. Exact hits always beat
fuzzy ones.

> **Limitation.** Lead-ins ("go to", "open", "show") are stripped; **trailing
> filler is not**. "go to dashboard please" scores 0.696 and does **not** match.
> Lowering the threshold would start matching genuinely different commands to
> each other. There is a test documenting this boundary.

**Ordinals** — only the master-data sidebar answers to position. Two lists both
matching "second menu" would resolve by registration order, which no user can
predict. Positional phrases come **last** in a command's phrase list, so a named
request never resolves by position.

**Session lifecycle** — a watchdog every 15 s restarts a dropped session and
switches the mic off after 3 minutes of silence. Auto-off is a _timeout, not a
decision_: the stored preference is left alone.

**The `resetActivity` flag on restart — do not remove it.** `true` when the user
switches the mic on, `false` when the watchdog revives a dropped session. If a
restart also reset the clock, an engine that drops every few seconds would hold
the microphone open forever and the timeout could never fire.

**Performance** — the provider is built to not re-render the app on speech:
`transcribing: false`, a module-scope static command array, a ref-backed registry,
and `useSyncExternalStore` so only the mic button re-renders. (The Angular port
needs none of this — a signal notifies only the views that read it.)

**Default-on**, unless the user explicitly switched it off — that survives a
reload. Browsers grant the microphone only from a gesture or a prior grant, so a
default-on start can legitimately fail; that is handled and surfaced.

### Extension Points

- **Commands for a screen:** `useSpeechCommands(memoizedCommands)` — registered
  on mount, unregistered on unmount, which is what stops a command resolving
  against a screen that is gone.
- **Commands from a nav list:** `useNavigationCommands` / `useMasterDataCommands`
  — built from the same arrays the layouts render, so a link and its voice
  command cannot drift apart.
- **A new lead-in phrase:** the `LEAD_INS` array in `commandMatcher.ts`.
