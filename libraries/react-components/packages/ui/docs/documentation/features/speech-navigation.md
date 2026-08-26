# Speech navigation

> Evidence-based. Claims are labelled **Implemented** / **Inferred** /
> **Recommended** / **Limitation** / **Needs product input**. Unlabelled claims
> are Implemented. See [../README.md](../README.md).
>
> **Companion document:** [`frontend/react/SpeechCMD.md`](../../frontend/SpeechCMD.md)
> holds the architecture decision — why one app-level adapter rather than a hook
> per component — with the library-source evidence behind it. This document
> covers the user-facing feature, vocabulary and extension.

---

## 1. Overview

A voice layer over the existing navigation. Say a destination — "dashboard",
"open the second menu", "error log" — and the app navigates there. One
microphone session serves the whole application; components register commands
into it and never touch the Web Speech API.

Built on `react-speech-recognition@4.0.1`, wrapped so nothing outside
`src/speech/` imports it.

### Business purpose

**Needs product input** for _why_ voice navigation is wanted. What is clear from
code: it targets the app's deepest navigation — the 13-entry Master Data sidebar,
several of whose labels are awkward to say aloud.

### Intended users

Anyone using the app. Voice is a **progressive enhancement**: `useSpeechCommands`
is a no-op without the provider, so a component that offers commands still works
without the feature.

---

## 2. Entry points

### Mic toggle

Top app bar of **both** shells — public and admin — immediately left of the theme
controls and the Logout button. Global controls belong together, it is reachable
from every screen, and it is not in the tab path to anything destructive.

### Modules

| Module                            | Role                                                                  |
| --------------------------------- | --------------------------------------------------------------------- |
| `speech/SpeechProvider.tsx`       | The single `useSpeechRecognition` call; registry, autostart, watchdog |
| `speech/speechContext.ts`         | Stable actions context                                                |
| `speech/speechStore.ts`           | Status via `useSyncExternalStore`; persisted preference               |
| `speech/commandMatcher.ts`        | Pure phrase → command matching                                        |
| `speech/ordinals.ts`              | Positional phrase generation                                          |
| `speech/useSpeechCommands.ts`     | `useSpeechCommands`, `useSpeechContext`, `useOptionalSpeechContext`   |
| `speech/useNavigationCommands.ts` | Nav metadata → commands                                               |
| `speech/SpeechControls.tsx`       | Mic button + help sheet + global commands                             |
| `speech/MicToggleButton.tsx`      | Animated toggle                                                       |
| `speech/SpeechHelpDialog.tsx`     | Live vocabulary list                                                  |
| `routes/navigation.tsx`           | Single source of truth for destinations                               |

---

## 3. User flows

### Primary — navigate by voice

1. The mic is on (default). The button shows a pulsing ring.
2. User says "go to the dashboard".
3. The engine finalises the phrase; the provider matches it.
4. The command runs; the app navigates. The phrase is recorded as a breadcrumb.

### Primary — reach a sidebar entry by position

On Master Data, each sidebar row shows its number **while the mic is listening**.
"Open the second menu" → the second entry. Also accepted: "second menu item",
"second sidebar button", "menu two", "menu 2", "2nd menu", or bare "second".

### Alternate — discover the vocabulary

Say **"help"** (or "what can I say"). The dialog lists everything registered
_right now_, grouped, so a page that adds commands documents itself.

### Alternate — turn the mic off

Click the button or say "stop listening". The choice is **persisted**; a reload
does not turn it back on.

### Alternate — silence

After **3 minutes** with no recognised speech, the mic switches itself off and a
snackbar says so. The stored preference is left alone, so the next load comes up
listening — a timeout is not a decision.

### Failure — phrase matches nothing

The button badge flashes warning for 1.5s. Nothing runs. The phrase still counts
as activity: someone whose phrase missed is still using the feature.

### Failure — microphone blocked

The provider catches the failure, drops to a `denied` state, logs
`SPEECH_START_FAILED` at warning level, and the tooltip reads "Microphone
blocked — allow access, then click to retry".

---

## 4. Architecture

```
main.tsx
  └── SpeechProvider                       ONE useSpeechRecognition({ transcribing: false })
        │   registry: useRef<Map>          registration renders nothing
        │   STATIC_COMMANDS = [{ command: '*', callback }]   module scope, never changes
        │
        ├── speechStore  (useSyncExternalStore)   status, lastHeard, lastMatched, lastFailed
        │
        └── RouterProvider
              └── PublicLayout / AdminShellLayout
                    ├── useNavigationCommands(PUBLIC_NAV | ADMIN_NAV)
                    ├── SpeechControls
                    │     ├── MicToggleButton   ← subscribes to 2 store slices
                    │     ├── SpeechHelpDialog
                    │     └── global commands (help, back, scroll, stop, logout)
                    └── MasterDataLayout
                          └── useMasterDataCommands(MASTER_DATA_NAV)   ← with ordinals
```

### Why one provider

Full reasoning in `SpeechCMD.md`; the two facts that decided it:

1. **The microphone is already a singleton.** One `RecognitionManager`, one
   browser instance. Per-component hooks give N subscribers to one microphone,
   with N places able to start and stop it.
2. **`transcribing` defaults to `true`.** Interim results fire continuously while
   someone speaks, so every hook consumer would re-render many times per
   utterance. With `transcribing: false` the library skips its transcript
   dispatch — **no state update, no re-render** — while command matching still
   runs. That only works if exactly one component holds the hook.

### Why a single splat command

The provider hands the library one module-scope array:

```ts
const STATIC_COMMANDS = [
  {
    command: '*',
    callback: (phrase: string) => {
      dispatchPhrase(phrase);
    },
  },
];
```

The library never learns about our commands. Registration writes into a ref-backed
`Map`, so **adding or removing commands renders nothing**. Handing the library a
real `commands` array would mean rebuilding it on every route change and holding
it in provider state — re-rendering the tree each time.

It also buys control over matching (§5), which the library's per-command regex
does not give.

---

## 5. Matching

`commandMatcher.ts` is pure — no React, no Web Speech API — so the part most
likely to need tuning is testable without a microphone or a browser.

### Pipeline

```
raw phrase
  → normalize()      lowercase, strip punctuation (Unicode-aware), collapse spaces
  → candidates: [normalized, stripLeadIn(normalized)]
  → for each command, for each phrase:
        exact match?   → return immediately, score 1
        similarity ≥ threshold (0.72)? → keep the best
  → best match or null
```

### Lead-ins

Stripped once, in one table, rather than enumerated on every command: `please`,
`can you`, `could you`, `navigate to (the)`, `take me to (the)`, `go to (the)`,
`show me (the)`, `switch to (the)`, `open (the)`, `show`, `goto`.

Both the raw phrase **and** the stripped one are tried, so a command whose own
phrase legitimately starts with a lead-in ("show commands") still matches. Only
the outermost lead-in is removed — "go to open sesame" → "open sesame".

### Similarity

Dice coefficient over character bigrams, chosen over edit distance because
recognition errors are usually whole wrong words, and bigram overlap degrades
gracefully there — `"manage user"` vs `"manage users"` scores > 0.9. Threshold
**0.72**, tuned so `"dashboard"` cannot reach `"generic card"`.

**Exact hits always beat fuzzy ones.** An exact match returns immediately, so a
phrase that _is_ a command can never be stolen by a longer, similar one. This is
what keeps the generated positional phrases safe: "second menu" and "third menu"
are similar strings.

### Positional phrases

`ordinals.ts` generates, per index and noun:

| Form                 | Example       |
| -------------------- | ------------- |
| ordinal + noun       | `second menu` |
| digit-ordinal + noun | `2nd menu`    |
| noun + number word   | `menu two`    |
| noun + digit         | `menu 2`      |
| bare ordinal         | `second`      |

Nouns: `menu`, `menu item`, `sidebar button`, `item`. Kept to four because every
noun multiplies the phrase count and each near-duplicate is another chance for a
fuzzy mismatch. Generation stops past the twentieth entry — nobody counts menu
items that far out loud.

Digit ordinals handle the teens correctly (`11th`, not `11st`).

**Only the sidebar uses ordinals**, deliberately: two lists both answering to
"second menu" would resolve by registration order, which a user cannot predict.
Positional phrases are appended **after** the label and aliases, so a request by
name never resolves by position.

---

## 6. Vocabulary

### Navigation

Derived from `routes/navigation.tsx`, the same arrays the layouts render — a link
and its voice command cannot drift apart.

| Group       | Examples                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public      | home, about, team, contact us, login (+ aliases: "our team", "get in touch", "sign in")                                                                                                                 |
| Admin       | dashboard, master data (+ "overview", "charts")                                                                                                                                                         |
| Master Data | 13 entries, each with aliases and ordinals — "products", "inline edit", "users", "theme", "snackbar", "card", "popup", "chart", "api scenarios", "api examples", "product form", "order form", "errors" |

### Global

| Command | Phrases                                                |
| ------- | ------------------------------------------------------ |
| Help    | help, what can i say, voice commands, show commands    |
| Close   | close, close dialog, dismiss                           |
| Back    | go back, back, previous page                           |
| Scroll  | scroll down/up, page down/up, scroll to top, go to top |
| Stop    | stop listening, microphone off, mic off, stop voice    |
| Log out | log out, logout, sign out _(admin shell only)_         |

"Stop listening" must work while listening — otherwise the only way out is the
mouse.

### Error console tabs

api tab / api errors, application tab / app errors, unit tests tab / test failures.

---

## 7. Behaviour details

### Default on, but not against the user

The mic starts listening on load. An explicit **off** is persisted
(`app.speech.enabled`) and survives reload.

**Limitation — browser constraint.** Browsers grant microphone access only from a
user gesture or a prior grant for the origin. On a first visit the default-on
start prompts, and can be blocked outright. From the second visit it starts
silently. No code can work around this.

### Language

`en-IN`, per the product spec, with `continuous: true`.

### Inactivity timeout

A watchdog ticks every 15s. Any recognised speech — matched or not — counts as
activity. After 3 minutes of silence the mic switches off and the preference is
**not** written.

The same watchdog restarts a dropped session, because Chrome ends "continuous"
sessions on its own and `browserSupportsContinuousListening` is false on some
engines.

**A real bug lived here.** The restart originally reset the activity clock, so an
engine dropping every few seconds would hold the mic open forever and the timeout
could never fire. Restarts now pass `resetActivity: false`. Covered by a test.

---

## 8. Performance

The stated requirement was that speech must not degrade rendering. Three
mechanisms, and one measurement:

| Mechanism                                  | Effect                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `transcribing: false`                      | The library skips its transcript dispatch — the provider never re-renders on speech         |
| Ref-backed registry + static splat command | Registering or unregistering renders nothing                                                |
| `useSyncExternalStore` with selectors      | Only the mic button re-renders, and only when its slice changes                             |
| Stable `children` element identity         | The provider _does_ re-render when `listening` flips (rare); React bails out on the subtree |
| CSS keyframe pulse                         | Runs on the compositor; animating from state would re-render the button ~60×/second         |

**Verified.** `SpeechProvider.test.tsx` renders a memoised child, speaks three
phrases (two matched, one not), and asserts the child's render count is
**unchanged**.

---

## 9. Accessibility and responsive behaviour

**Implemented**

- The toggle is a real `IconButton` with `aria-pressed` and an `aria-label` that
  changes with state ("Turn voice commands on/off").
- Status is conveyed three ways — icon shape (`Mic` / `MicOff`), badge colour,
  and tooltip text — never colour alone.
- `prefers-reduced-motion` replaces the pulse with a steady ring: the state stays
  visible, the movement does not.
- Disabled when unsupported, with a tooltip explaining why; the wrapper `<span>`
  keeps the tooltip reachable while disabled.
- Sidebar ordinals are `aria-hidden` — a screen reader hears "Manage User", not
  "3 Manage User". The number is a visual affordance for voice.

**Sidebar numbers without layout shift.** The gutter is **always** in the layout
(22px, `flexShrink: 0`); only its contents fade. Mic on and mic off produce
identical row geometry, so toggling cannot reflow a row. A test asserts the
gutter elements are the **same DOM nodes** with the **same width** after
toggling — proving nothing remounted.

**Limitation.** Voice is not an accessibility feature here. It is an alternative
input for users who can speak clearly in the recognised language; it does not
replace keyboard access, and nothing routes screen-reader focus after a voice
navigation.

**Limitation.** No visible caption of what was heard. `lastHeard` is in the store
but no component renders it, so a user cannot see why a phrase missed.
**Recommended:** a transient "heard: …" caption near the button.

---

## 10. Best-practice justification

| Practice                               | Code evidence                                           | Justification                                                                                           | Trade-off                                                              |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **One app-level adapter**              | Single `useSpeechRecognition` (`SpeechProvider.tsx:63`) | The mic is a singleton; one owner makes that explicit instead of racing.                                | Every consumer depends on one provider being mounted.                  |
| **`transcribing: false`**              | `SpeechProvider.tsx:65`                                 | Commands still match, but no transcript state exists — the provider never re-renders on speech.         | The app has no transcript; dictation would need a second, scoped hook. |
| **Static splat command**               | `STATIC_COMMANDS` (`SpeechProvider.tsx:41`)             | Registration never re-renders anything, and matching is ours to control.                                | The library's fuzzy matching and named variables are unused.           |
| **Ref-backed registry**                | `useRef<Map>` (`SpeechProvider.tsx:54`)                 | A Map write on mount, a delete on unmount. No render.                                                   | Registration is invisible to React DevTools.                           |
| **Status in an external store**        | `useSyncExternalStore` (`speechStore.ts:88`)            | The mic button re-renders on its own slice only.                                                        | A second state mechanism alongside context.                            |
| **Pure matcher**                       | `commandMatcher.ts`                                     | 26 tests with no microphone, browser or rendered tree.                                                  | Duplicates matching the library already offers.                        |
| **Commands derived from nav metadata** | `routes/navigation.tsx`                                 | A renamed page cannot drift from its voice command.                                                     | Nav metadata now carries `aliases`, which is speech-specific.          |
| **Exact beats fuzzy**                  | early return (`commandMatcher.ts:144`)                  | A phrase that _is_ a command can never be stolen by a similar one — what makes generated ordinals safe. | Exact matching is order-dependent within a phrase list.                |
| **Generated ordinals**                 | `ordinals.ts`                                           | The list renumbers itself when an entry is added or moved.                                              | ~17 phrases per entry to match against.                                |
| **Ordinals on one list only**          | `useMasterDataCommands`                                 | Avoids unpredictable resolution between two lists.                                                      | Other lists cannot be addressed by position.                           |
| **Graceful degradation**               | `useOptionalSpeechContext`                              | A component offering commands renders fine without the provider — voice is an enhancement.              | A missing provider fails silently rather than loudly.                  |
| **Loud failure where required**        | `useSpeechContext` throws                               | The mic button and help sheet exist _for_ speech; a dead button is worse than an error.                 | Two hooks to choose between.                                           |
| **Preference persisted, timeout not**  | `speechStore.ts`                                        | Turning the mic back on after the user said no is hostile; a timeout is not a decision.                 | Two rules to remember.                                                 |
| **CSS animation**                      | `keyframes` in `MicToggleButton`                        | Compositor-driven, zero renders.                                                                        | Pseudo-element styling is less obvious than a component.               |
| **Reserved gutter for numbers**        | `MasterDataLayout.tsx:24`                               | Toggling the mic cannot reflow the sidebar.                                                             | 22px is always occupied.                                               |
| **Failures logged, not thrown**        | `logWarning` on start/command failure                   | A broken command never breaks the page; the failure is visible in the console.                          | Silent to the user beyond the badge flash.                             |

---

## 11. Testing

| File                                       | Tests | Covers                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `speech/commandMatcher.test.ts`            | 26    | `normalize`, `stripLeadIn` (6 forms + outermost-only), `similarity`, routing 8 phrasings, exact-over-fuzzy, lead-in-prefixed command, recognition-error tolerance, non-commands, bare lead-in, custom threshold                                                              |
| `speech/ordinals.test.ts`                  | 18    | Phrase generation, digit-ordinal suffixes incl. teens, cut-off past twenty, **10 real sidebar phrasings**, first/last, adjacent ordinals not confused, name beats position, correct path on run, renumbering on reorder                                                      |
| `speech/SpeechProvider.test.tsx`           | 10    | Default-on with `continuous`/`en-IN`; respects a stored off; runs a command with lead-in; flags unmatched; survives a throwing command; unregisters on unmount; **3-minute timeout**; **stays on while speech arrives**; toggle persists; **no subtree re-render on speech** |
| `features/admin/MasterDataLayout.test.tsx` | 5     | Numbers match the commands' expectations; hidden when off; shown when listening; **same DOM nodes and width after toggling**; numbers absent from accessible names                                                                                                           |

**59 tests.** The library is mocked so the splat callback can be invoked
directly — that is what makes provider behaviour testable without a microphone.

```bash
cd frontend/react
pnpm exec vitest run src/speech src/features/admin/MasterDataLayout.test.tsx
```

**Limitation.** No test covers the permission-denied path, because it needs a
real browser permission decision.
**Limitation.** Matching is tested against the _current_ vocabulary. Adding a
command whose name is close to an existing one would not fail any test.

---

## 12. Limitations and trade-offs

| #   | Limitation                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No wake word.** While listening, every phrase is matched, so a nearby conversation can navigate the app. A wake-word prefix check in the matcher would fix it.       |
| 2   | **Browser permission constrains default-on** (§7).                                                                                                                     |
| 3   | **Web Speech API support is uneven.** Chromium-based browsers work best; some engines lack continuous listening (handled by the watchdog); Firefox support is limited. |
| 4   | **Recognition is a network service** in Chrome — audio goes to Google's servers. Not stated anywhere in the UI. **Recommended:** say so near the mic toggle.           |
| 5   | **`en-IN` is hardcoded.** No language selector.                                                                                                                        |
| 6   | **No dictation into fields.** Needs `transcribing: true` on a focused field — a second, scoped hook; deliberately out of scope.                                        |
| 7   | **No visible transcript** (§9).                                                                                                                                        |
| 8   | **Ordinals require counting** the sidebar by eye; the numbers help, but only while the mic is on.                                                                      |
| 9   | **No confirmation for consequential commands.** "Log out" runs immediately — a misrecognition ends the session.                                                        |
| 10  | **Commands must be referentially stable**, enforced only by a doc comment.                                                                                             |
| 11  | **The registry is global per provider.** Two components registering the same phrase resolve by iteration order.                                                        |

---

## 13. Extension guide

### Add commands to a page

```tsx
const commands = useMemo<SpeechCommand[]>(
  () => [{ id: 'page:save', phrases: ['save', 'save changes'], group: 'Product form', run: save }],
  [save],
);

useSpeechCommands(commands);
```

`commands` **must** be referentially stable — a fresh array per render
re-registers on every render. Anything registered appears in **help**
automatically.

### Add a destination

Add an entry to `routes/navigation.tsx`. One edit gives a sidebar link, a voice
command, and — for Master Data — its ordinal phrases.

Prefer `aliases` over new commands for anything that is really a destination:

```ts
{ label: 'Manage User', to: 'users', icon: <GroupIcon />,
  aliases: ['users', 'user list', 'manage users'] },
```

### Add ordinals to another list

```ts
navCommandsFor(items, group, resolvePath, navigate, { ordinalNouns: ['tab'] });
```

Use nouns that clearly mean _that_ list, or the two will collide (§5).

### Add a wake word

In `matchCommand`, require and strip a prefix before matching. One place, because
matching is centralised.

### Swap the recognition engine

`SpeechRecognition.applyPolyfill` accepts any W3C-compliant implementation.
Nothing outside `SpeechProvider.tsx` changes.

---

## 14. Evidence index

| Claim                                             | File                                                    | Line       |
| ------------------------------------------------- | ------------------------------------------------------- | ---------- |
| Single recognition hook                           | `frontend/react/src/speech/SpeechProvider.tsx`                | 63         |
| `transcribing: false`                             | `frontend/react/src/speech/SpeechProvider.tsx`                | 65         |
| Static splat command                              | `frontend/react/src/speech/SpeechProvider.tsx`                | 41         |
| Ref-backed registry                               | `frontend/react/src/speech/SpeechProvider.tsx`                | 54         |
| Language and continuous mode                      | `frontend/react/src/speech/SpeechProvider.tsx`                | 18         |
| Inactivity timeout constant                       | `frontend/react/src/speech/SpeechProvider.tsx`                | 21         |
| Watchdog interval                                 | `frontend/react/src/speech/SpeechProvider.tsx`                | 24         |
| Start failure handled and logged                  | `frontend/react/src/speech/SpeechProvider.tsx`                | 88–101     |
| Restart does not reset activity (`resetActivity`) | `frontend/react/src/speech/SpeechProvider.tsx`                | 81         |
| Stable context value                              | `frontend/react/src/speech/speechContext.ts`                  | 23         |
| External store selector                           | `frontend/react/src/speech/speechStore.ts`                    | 88         |
| Persisted preference                              | `frontend/react/src/speech/speechStore.ts`                    | 108        |
| Normalisation                                     | `frontend/react/src/speech/commandMatcher.ts`                 | 58         |
| Lead-in stripping                                 | `frontend/react/src/speech/commandMatcher.ts`                 | 67         |
| Dice similarity                                   | `frontend/react/src/speech/commandMatcher.ts`                 | 84         |
| Matching + exact-first                            | `frontend/react/src/speech/commandMatcher.ts`                 | 122, 144   |
| Ordinal generation                                | `frontend/react/src/speech/ordinals.ts`                       | 83         |
| Sidebar nouns                                     | `frontend/react/src/speech/ordinals.ts`                       | 67         |
| Ordinals only on the sidebar                      | `frontend/react/src/speech/useNavigationCommands.ts`          | 81         |
| Positional phrases appended last                  | `frontend/react/src/speech/useNavigationCommands.ts`          | 45         |
| Optional context (degradation)                    | `frontend/react/src/speech/useSpeechCommands.ts`              | 14         |
| Required context (loud failure)                   | `frontend/react/src/speech/useSpeechCommands.ts`              | 25         |
| Registration hook                                 | `frontend/react/src/speech/useSpeechCommands.ts`              | 44         |
| Global commands                                   | `frontend/react/src/speech/SpeechControls.tsx`                | 28         |
| Mic button + animation                            | `frontend/react/src/speech/MicToggleButton.tsx`               | 19         |
| Help dialog reads the live registry               | `frontend/react/src/speech/SpeechHelpDialog.tsx`              | 22         |
| Navigation metadata                               | `frontend/react/src/routes/navigation.tsx`                    | 40, 48, 58 |
| Sidebar ordinal gutter + selector                 | `frontend/react/src/features/admin/MasterDataLayout.tsx`      | 24, 29     |
| Provider mounted app-wide                         | `frontend/react/src/main.tsx`                                 | 45         |
| Matcher tests                                     | `frontend/react/src/speech/commandMatcher.test.ts`            | —          |
| Ordinal tests                                     | `frontend/react/src/speech/ordinals.test.ts`                  | —          |
| Provider tests                                    | `frontend/react/src/speech/SpeechProvider.test.tsx`           | —          |
| Sidebar number tests                              | `frontend/react/src/features/admin/MasterDataLayout.test.tsx` | —          |
