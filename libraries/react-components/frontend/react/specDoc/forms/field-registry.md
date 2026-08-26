## Component Specification

### Name & Purpose

The field registry — maps a schema `type` string to a renderer, an empty value
and any type-contributed validators. The extension point of the form engine.

### Location

`src/components/forms/fields/` — `registry.ts`, `types.ts`, `index.ts`,
`valueCoercion.ts`, `FieldShell.tsx`, and one renderer per type

### Public Interface

```ts
export function registerFieldType(type: string, definition: FieldTypeDefinition): void;
export function registerFieldTypes(map: FieldTypeMap): void;
export function unregisterFieldType(type: string): void;
export function resolveFieldType(
  type: string,
  overrides?: FieldTypeMap,
): FieldTypeDefinition | undefined;
export function getRegisteredFieldTypes(): string[];

interface FieldTypeDefinition {
  render: ComponentType<FieldRendererProps>;
  emptyValue: FieldValue;
  buildValidators?: (field: FieldConfig) => ValidatorMap;
}
type FieldTypeMap = Record<string, FieldTypeDefinition>;
```

### Dependencies

- Internal: `fields/*` renderers, `valueCoercion`.
- External: MUI.

### Data Models

Registered types (`fields/index.ts`) and the renderer each maps to:

| Type(s)                                                                                                       | Renderer             | Empty value |
| ------------------------------------------------------------------------------------------------------------- | -------------------- | ----------- |
| `text` `email` `password` `number` `tel` `url` `search` `color` `date` `time` `datetime-local` `month` `week` | `TextInputField`     | `''`        |
| `textarea`                                                                                                    | `TextareaField`      | `''`        |
| `select`                                                                                                      | `SelectField`        | `''`        |
| `radio`                                                                                                       | `RadioGroupField`    | `''`        |
| `toggle`                                                                                                      | `ToggleGroupField`   | `''`        |
| `checkbox`                                                                                                    | `CheckboxField`      | `false`     |
| `switch`                                                                                                      | `SwitchField`        | `false`     |
| `checkboxGroup`                                                                                               | `CheckboxGroupField` | `[]`        |
| `autocomplete`                                                                                                | `AutocompleteField`  | `[]`        |
| `file`                                                                                                        | `FileUploadField`    | `[]`        |
| `rating`                                                                                                      | `RatingField`        | `0`         |
| `slider`                                                                                                      | `SliderField`        | `0`         |

### Business Rules & Constraints

- **Two registration scopes:** globally at module load
  (`registerFieldType('signature', …)`), or per-form via the `fieldTypes` prop.
  Per-form shadows global.
- **An unknown type degrades to a text input** rather than rendering nothing — a
  schema typo produces a usable field, not a blank space.
- **`emptyValue` for array types must produce a _fresh_ array per control.** A
  shared literal would be mutated by every form on the page; `buildDefaultValues`
  copies arrays for this reason.
- **Numeric types use `0`, not `''`**, so a `min` validator compares numbers.
- **Array-valued fields write a new array, never mutate.** React compares by
  reference; an in-place `push` would not re-render.
- **`file` holds real `File` objects.** That is what makes multipart possible —
  a JSON body cannot carry bytes.
- **`FieldShell` owns the label / hint / error layout**, so every renderer looks
  the same and only supplies its control.

### Extension Points

**Adding a field type — the whole procedure:**

1. A renderer component taking `FieldRendererProps`, wrapping its control in
   `FieldShell`.
2. One entry in `fields/index.ts`:
   ```ts
   signature: { render: SignatureField, emptyValue: '' },
   ```
3. Nothing else. The engine, the schema type and every existing form are
   untouched.

- **A validator contributed by the type itself:** `buildValidators` on the
  definition — that is how `email` gets format validation without every schema
  repeating a pattern.
