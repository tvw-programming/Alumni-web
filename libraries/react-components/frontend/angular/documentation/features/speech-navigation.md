# Speech navigation

Voice commands over the **Web Speech API**, with no library.

## Why no library

React used `react-speech-recognition`. There is no Angular equivalent, and it
turned out not to need one: the library's real job was turning an event-based
engine into React state, and a signal does that directly. What is left is the
session lifecycle — which was always the actual work.

## What was deleted

The React provider carried a lot of machinery purely to avoid re-rendering the
app on every recognised phrase:

| React | Status |
| --- | --- |
| `transcribing: false` so the library skipped its own dispatch | deleted |
| a module-scope static command array with a mutable module-level callback | deleted |
| a ref-backed registry so registration caused no render | deleted — it is a plain `Map`; nothing renders from it |
| a separate external store read through `useSyncExternalStore` | deleted — a signal notifies exactly the views that read it |

Only the mic button and the help sheet read speech state, so only they update.

## Ported verbatim

`command-matcher.ts` and `ordinals.ts` — 258 lines, **44 tests passing
unmodified**.

### Matching

Dice coefficient over character bigrams, threshold **0.72**. Chosen over edit
distance because recognition errors are usually whole wrong words rather than
single characters, and bigram overlap degrades more gracefully there
("manage user" vs "manage users" stays high).

Exact hits always beat fuzzy ones, so a phrase that *is* a command can never be
stolen by a longer command that happens to be similar.

Lead-ins ("go to", "open", "show") are stripped, and the phrase is tried both
with and without — a command whose phrase legitimately starts with "show" must
still match.

> **Limitation, and it is real.** Trailing filler is **not** stripped.
> "go to dashboard please" scores 0.696 against the 0.72 threshold and does not
> match. Lowering the threshold to absorb filler would start matching genuinely
> different commands to each other. This is inherited from React, and there is a
> test documenting the boundary rather than wishing it away.

### Ordinals

`ordinalPhrases(index, nouns)` generates "second menu", "menu 2" and friends.

**Only the master-data sidebar uses ordinals.** It is long, visibly ordered, and
several labels are awkward to say — "Manage Product (inline edit)" — so counting
is often the quickest way in. Two lists both answering to "second menu" would
resolve by registration order, which is not something a user can predict.

Positional phrases come **last** in a command's phrase list, so a named request
never resolves by position.

## The service

[`speech.service.ts`](../../src/app/core/speech/speech.service.ts).

### Registration

Keyed by owner, so a component re-registering replaces its own entry rather than
accumulating duplicates. Each shell registers on construction and unregisters on
destroy — which is what stops "second menu" resolving against a sidebar that is
no longer on screen.

### Session lifecycle

Chrome ends a "continuous" session on its own after a while, and some engines do
not honour `continuous` at all. A watchdog runs every 15 s and does two things:

1. **Restarts a dropped session.**
2. **Switches the mic off after 3 minutes of silence.**

Auto-off is a *timeout, not a decision*: the stored preference is left alone, so
the next reload still comes up listening.

### The `resetActivity` flag — do not remove it

```ts
private start(resetActivity = true): void
```

`true` when the user switches the mic on. `false` when the watchdog revives a
dropped session.

**Only the former is activity.** If a restart also reset the clock, an engine
that drops every few seconds would hold the microphone open indefinitely and the
inactivity timeout could never fire. There is a test that fails if the flag is
removed.

### Engine errors

`no-speech` and `aborted` are ordinary — silence, and our own restarts — and are
ignored. `not-allowed` moves to `denied` and stops wanting the mic, so a denial
cannot become a restart loop against a blocked permission.

`interimResults` is **off**: commands act on settled speech only, so the engine
is asked not to produce partial results at all.

## Default-on, and the permission reality

The mic comes up listening, per the product spec, unless the user has explicitly
switched it off — that preference survives a reload. Turning it back on against
a stated wish on every refresh would be hostile.

**Limitation.** Browsers grant microphone access only from a user gesture or a
prior grant, so the default-on start can legitimately fail on a first visit. It
is handled: the failure logs a warning and the button shows "Microphone blocked
— allow access, then click to retry".

## Sidebar ordinals, and the no-flicker requirement

Numbers appear in the sidebar **only while the mic is on** — they exist to tell
the user what to say and are clutter otherwise.

The gutter is **permanently reserved** in the layout; only opacity changes. This
was an explicit requirement ("screen does not have to flicker while number is
not shown") and it is measured, not assumed:

```
gutter geometry (mic on) : 201,22 | 201,22 | 201,22 | 201,22
gutter geometry (mic off): 201,22 | 201,22 | 201,22 | 201,22
layout unchanged: true
```

Identical left offset and width in both states.

The ordinal uses `matListItemMeta`, Material's trailing slot. A plain `<span>`
is not a slot `mat-list-item` knows about, so it lands in the unscoped content
area and renders *below* the label. The sidebar is 264px rather than 240px to
buy back the reserved gutter instead of truncating every label.

## Mic button

The pulse ring is a **CSS keyframe on a pseudo-element**: a pseudo-element
cannot affect layout while it animates, and a keyframe runs on the compositor
rather than waking the framework 60 times a second for decoration.
`prefers-reduced-motion` keeps the ring but stops the movement — the state stays
visible.

The heard phrase is announced through an `aria-live="polite"` region rather than
shown, because a visible caption in the toolbar would push the layout around on
every utterance.

## Help sheet

Built from the **live registry**, so it cannot describe a command that no longer
exists or miss one that was just added — the failure mode of every written-down
shortcut reference. It snapshots on open: commands register and unregister as
routes change, and a list reshuffling while it is being read is worse than one
that is a few seconds stale.

**Verified**: 15 commands across two groups with aliases, on the master-data
route.
