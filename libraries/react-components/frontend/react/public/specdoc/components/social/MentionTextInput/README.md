# MentionTextInput

A text input that suggests people after `@`.

## API

```ts
type MentionTextInputProps = {
  value: string;
  candidates: MentionCandidate[];
  loading?: boolean;
  onChange: (value: string) => void;
  onQueryChange: (query: string | null) => void; // debounce + cancel upstream
};
```

## Two things most mention inputs get wrong

- **The caret is restored after inserting.** A mention that dumps the cursor at
  the end of the text makes editing mid-sentence impossible. Restoration waits a
  frame, because the controlled value has to land first.
- **The result count is announced.** A listbox appearing silently under a text
  field does not exist for a screen-reader user; an `aria-live` region says
  "5 people".

## React 19

`useDeferredValue` for the candidate list — the input updates immediately and
filtering lags a frame rather than blocking the keystroke.

**Not** `useActionState` per keystroke. One Action per character is a request
storm with a queue behind it; the Action belongs to submitting the comment.

## Keyboard (combobox semantics)

| Key    | Does                          |
| ------ | ----------------------------- |
| ↓ / ↑  | move the highlight, wrapping  |
| Enter  | insert the highlighted person |
| Escape | close, keeping the text       |

`role="combobox"` with `aria-expanded`, `aria-controls` and `aria-autocomplete`
on the input; `role="listbox"`/`role="option"` with `aria-selected` on the list.
