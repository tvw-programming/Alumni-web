# Speech-oriented navigation — architecture

## The question

`react-speech-recognition` exposes two things: a `useSpeechRecognition` hook and
a `SpeechRecognition` object of static methods. Three shapes were possible:

1. **Hook per component** — every screen calls `useSpeechRecognition` with its
   own `commands`.
2. **A component** — drop `<VoiceNav />` into each layout, each owning a hook.
3. **One app-level adapter** — a single provider owns the one recognition
   session; everything else registers commands into it.

**We chose 3.** The reasoning below is from the library's source
(`react-speech-recognition@4.0.1`, `dist/index.js`), not from the README.

## Why not a hook per component

### The microphone is already global

The library's own docs are explicit: any method on `SpeechRecognition` "will
affect _all_ components using `useSpeechRecognition`". There is one
`RecognitionManager` singleton and one browser `SpeechRecognition` instance. So
per-component hooks do not give per-component microphones — they give N
subscribers to one microphone, with N places able to start and stop it. Two
screens each calling `startListening` with different options is a race whose
winner depends on mount order.

An app-level owner makes that singleton explicit instead of pretending it is not
there.

### Every transcribing consumer re-renders on every syllable

From `useSpeechRecognition`:

```js
const handleTranscriptChange = useCallback(
  (newInterimTranscript, newFinalTranscript) => {
    if (transcribing) {
      dispatch(appendTranscript(newInterimTranscript, newFinalTranscript));
    }
    matchCommands(newInterimTranscript, newFinalTranscript);
  },
  [matchCommands, transcribing],
);
```

`transcribing` defaults to **true**. Interim results fire continuously while
someone is speaking, so a component using the default re-renders many times per
utterance — and would do so on every screen that registered commands, for speech
that has nothing to do with it.

The same snippet shows the way out: with `transcribing: false` the dispatch is
skipped entirely — **no state update, no re-render** — while `matchCommands`
still runs. That is the single most important line in `SpeechProvider.tsx`, and
it only works if exactly one component holds the hook. Spread the hook across
screens and you are re-rendering N components for every phrase.

## The design

```
SpeechProvider              one useSpeechRecognition({ transcribing: false })
├── speechContext.ts        stable actions: register / getCommands / toggleMic
├── speechStore.ts          status via useSyncExternalStore (not context)
├── commandMatcher.ts       pure phrase → command matching
├── useSpeechCommands()     register commands for a component's lifetime
├── SpeechControls          mic button + help sheet + global commands
└── MicToggleButton         animated toggle, subscribes to two store slices
```

### One static command, forever

The provider hands the library a module-scope array containing a single splat:

```ts
const STATIC_COMMANDS = [{ command: '*', callback: (phrase) => dispatchPhrase(phrase) }];
```

The library never learns about our commands. Registration writes into a
`useRef` Map, so **adding or removing commands renders nothing** — not the
provider, not the caller, not the app. Handing the library a real `commands`
array would have meant rebuilding it on every route change and holding it in
provider state, re-rendering the tree each time.

It also buys control over matching, which the library's per-command regex does
not give us:

- `"go to"`, `"open"`, `"show me the"` … are stripped once in the matcher rather
  than enumerated on every command.
- Commands are **derived from the same nav arrays the layouts render**
  (`src/routes/navigation.tsx`), so a link and its voice command cannot drift.
- Fuzzy matching uses a Dice coefficient over character bigrams, chosen over edit
  distance because recognition errors are usually whole wrong words, and bigram
  overlap degrades gracefully there (`"manage user"` vs `"manage users"` scores
  > 0.9). Threshold 0.72, tuned so `"dashboard"` cannot reach `"generic card"`.
- Exact hits always beat fuzzy ones, so a phrase that _is_ a command can never be
  stolen by a longer, similar one. This is what keeps the generated positional
  phrases below safe: "second menu" and "third menu" are similar strings, and
  only exact-first stops one from being matched for the other.

### Positional phrases

The Master Data sidebar also answers to position — "open the second menu",
"menu 3", "2nd sidebar button" — generated per index by `ordinals.ts` rather
than hand-written, so the list renumbers itself when an entry is added or moved.

It is the only list with ordinals on purpose. Two registered lists both
answering to "second menu" would resolve by registration order, which a user
cannot predict. It earns them by being long, and by containing labels that are
awkward to say out loud ("Manage Product (inline edit)").

Positional phrases are appended _after_ the label and aliases, so a request by
name never resolves by position.

### Status is an external store, not context

`listening` and the "heard: …" caption are needed by exactly two small
components. In provider state they would re-render the app; in context they
would re-render every consumer. `useSyncExternalStore` with a selector means the
mic button re-renders only when the slice it selected actually changes.

### Why the provider re-rendering is still fine

`useSpeechRecognition` keeps `listening` and `isMicrophoneAvailable` in state, so
the provider does re-render when those flip. Two reasons that costs nothing:

1. It happens on mic on/off — a handful of times per session, not per phrase.
2. `children` is created by the provider's _parent_, so its element identity is
   unchanged across these re-renders and React bails out on the whole subtree.

`SpeechProvider.test.tsx` asserts this directly: a memoized child's render count
is unchanged after three recognized phrases.

## Behaviour decisions

### Default on, but not against the user's wishes

The mic starts listening on load. An explicit **off** is persisted
(`app.speech.enabled`) and survives reload — turning the mic back on every
refresh after someone switched it off would be hostile.

**Browser constraint worth knowing:** browsers only grant microphone access from
a user gesture or a prior grant for the origin. On a first visit the default-on
start will therefore prompt, and can be blocked outright. The provider catches
that, drops to a `denied` state, logs a warning, and the button explains what to
do. Autostart works from the second visit onwards, once permission is remembered.

### Three-minute inactivity timeout

A watchdog ticks every 15s. Any recognized speech — matched **or not** — counts
as activity; someone whose phrase missed is still clearly using the feature.

Auto-off deliberately does **not** write the stored preference: a timeout is not
a decision, so the next load still comes up listening.

The same watchdog restarts a dropped session (Chrome ends "continuous" sessions
on its own, and `browserSupportsContinuousListening` is false on some engines).
A restart passes `resetActivity: false` — otherwise an engine that drops every
few seconds would keep resetting the clock and the timeout could never fire.
That bug was real and is covered by a test.

### Placement

Top app bar, immediately left of the theme controls and the destructive Logout
button, in both shells. Global controls belong together; it is reachable from
every screen without being in the tab path to anything dangerous; and it sits
where users already look for account-level toggles.

### Animation

An expanding ring via a CSS `@keyframes` pseudo-element. It runs on the
compositor and costs zero renders — animating from JS state would re-render the
button ~60×/second for decoration. It is a `::before`, so it cannot affect layout
while it pulses, and `prefers-reduced-motion` gets a steady ring: the state stays
visible, the movement does not.

## Rules for adding commands

```tsx
const commands = useMemo<SpeechCommand[]>(
  () => [{ id: 'page:save', phrases: ['save', 'save changes'], group: 'Product form', run: save }],
  [save],
);

useSpeechCommands(commands);
```

- **`commands` must be referentially stable** (module constant or `useMemo` with
  honest dependencies). A fresh array per render re-registers per render — cheap,
  but pure waste in the hot path.
- Prefer adding `aliases` in `src/routes/navigation.tsx` over new commands for
  anything that is really a destination.
- Anything registered shows up in the **help** sheet automatically, so a page
  that adds commands documents itself.

## What is not done

- No wake word. Every phrase is matched while listening, so a conversation near
  the machine can navigate it. A wake word (`"hey admin, …"`) would be a prefix
  check in the matcher.
- No dictation into form fields. That needs `transcribing: true` on the focused
  field only — a second, scoped hook — and is deliberately out of scope here.
- No server-side recognition. `applyPolyfill` is the hook if a browser-independent
  engine is ever needed; nothing outside `SpeechProvider.tsx` would change.
