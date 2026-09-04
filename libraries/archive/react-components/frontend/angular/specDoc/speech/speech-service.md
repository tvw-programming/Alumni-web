## Component Specification

### Name & Purpose
`SpeechService` — voice navigation over the **Web Speech API** directly. There is
no Angular equivalent of `react-speech-recognition`, and it turned out not to be
needed.

### Location
`src/app/core/speech/` — `speech.service.ts`, `speech.types.ts`,
`command-matcher.ts`, `ordinals.ts`, `nav-commands.ts`;
`src/app/shared/speech/` — `mic-toggle-button.ts`, `speech-help-dialog.ts`

### Public Interface

```ts
@Injectable({ providedIn: 'root' })
export class SpeechService {
  readonly status: Signal<MicStatus>;
  readonly lastHeard: Signal<string>;
  readonly lastMatched: Signal<string | null>;
  readonly lastFailed: Signal<boolean>;
  readonly isListening: Signal<boolean>;
  readonly showsOrdinals: Signal<boolean>;   // listening || starting
  readonly isSupported: boolean;

  register(ownerId: string, commands: readonly SpeechCommand[]): () => void;
  getCommands(): SpeechCommand[];
  setMicEnabled(enabled: boolean): void;
  toggleMic(): void;
  dispatch(phrase: string): void;            // exposed for tests
  tickWatchdog(now?: number): void;          // exposed for tests
}

export const INACTIVITY_TIMEOUT_MS = 3 * 60_000;

// nav-commands.ts
export function navCommandsFor(items, group, resolvePath, navigate, options?): SpeechCommand[];
export function masterDataCommands(items, navigate): SpeechCommand[];
```

### Dependencies
- Internal: `SnackbarService`, `error-logger`, `monitoring`, `safe-storage`,
  `layout/navigation`.
- External: **none** — the Web Speech API is used directly, with local typings in
  `speech.types.ts` because TypeScript's DOM library does not declare it.

### Data Models

```ts
type MicStatus = 'unsupported' | 'denied' | 'off' | 'starting' | 'listening';
```
Preference key `app.speech.enabled`.

### Business Rules & Constraints

**`command-matcher.ts` and `ordinals.ts` are verbatim ports** — 258 lines, **44
tests passing unmodified**. Same Dice-coefficient matching, same 0.72 threshold,
same lead-in stripping, and the same documented limitation: **trailing filler is
not stripped**, so "go to dashboard please" scores 0.696 and does not match.

**What was deleted rather than ported.** Each existed to work around React's
rendering model:

| React | Angular |
| --- | --- |
| `transcribing: false` so the library skipped its dispatch | deleted |
| module-scope static command array | deleted |
| ref-backed registry | a plain `Map` — nothing renders from it |
| `useSyncExternalStore` + a hand-written store | signals |

**The `resetActivity` flag — do not remove it.** `false` when the watchdog
revives a dropped session, `true` when the user switches the mic on. Only the
latter is activity; otherwise an engine that drops every few seconds holds the
microphone open forever and the timeout can never fire. There is a test that
fails if it is removed.

**`interimResults` is off** — commands act on settled speech only.

**Engine errors:** `no-speech` and `aborted` are ordinary and ignored;
`not-allowed` moves to `denied` and stops wanting the mic, so a denial cannot
become a restart loop.

**Sidebar ordinals appear only while the mic is on, and the gutter is
permanently reserved** — only opacity changes. **Verified**: identical geometry
in both states (`201,22` before and after), so toggling cannot reflow a row. The
ordinal uses `matListItemMeta`; a plain `<span>` is not a slot `mat-list-item`
knows and lands *below* the label.

**The mic ring is a CSS keyframe on a pseudo-element** — it cannot affect layout,
and it runs on the compositor rather than waking the framework 60 times a second.
`prefers-reduced-motion` keeps the ring and drops the movement.

### Extension Points

- **Commands for a shell:** `speech.register(id, commands)` in the constructor,
  `DestroyRef.onDestroy(unregister)` — that is what stops "second menu" resolving
  against a sidebar that is gone.
- **Commands from a nav list:** `navCommandsFor` / `masterDataCommands`, built
  from the same arrays the layout renders.
- **Only one list may use ordinals** — two lists both answering "second menu"
  would resolve by registration order, which no user can predict.
