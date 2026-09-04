## Component Specification

### Name & Purpose
The Angular field registry — maps a schema `type` to a renderer component, an
empty value and any type-contributed validators.

### Location
`src/app/shared/forms/field-registry.ts`, `fields/index.ts`,
`fields/field-shell.ts`, `fields/*.ts`

### Public Interface

```ts
export function registerFieldType(type: string, definition: FieldTypeDefinition): void;
export function registerFieldTypes(map: FieldTypeMap): void;
export function resolveFieldType(type: string, overrides?: FieldTypeMap): FieldTypeDefinition | undefined;
export function buildValidators(field: FieldConfig, definition?: FieldTypeDefinition): ValidatorFn[];
export function buildDefaultValues(fields, overrides, fieldTypes?): FormValues;

interface FieldTypeDefinition {
  render: Type<unknown>;
  emptyValue: FieldValue;
  buildValidators?: (field: FieldConfig) => ValidatorFn[];
}

// Every renderer extends this.
@Directive()
export class FieldBase {
  readonly field = input.required<FieldConfig>();
  readonly control = input.required<FormControl>();
  protected readonly isRequired: Signal<boolean>;
  protected readonly errorText: Signal<string | null>;
}
```

### Dependencies
- Internal: `form-helpers` (`fieldErrorText`, ported verbatim from React).
- External: `@angular/forms`, Angular Material.

### Data Models

Registered types (`fields/index.ts`) — **18 types, at parity with React**:

| Type(s) | Renderer | Empty value |
| --- | --- | --- |
| `text` `email` `password` `number` `tel` `url` `search` `color` `date` `time` `datetime-local` `month` `week` | `TextField` | `''` |
| `textarea` | `TextareaField` | `''` |
| `select` | `SelectField` | `''` |
| `radio` | `RadioField` | `''` |
| `toggle` | `ToggleField` | `''` |
| `checkbox` | `CheckboxField` | `false` |
| `switch` | `SwitchField` | `false` |
| `checkboxGroup` | `CheckboxGroupField` | `[]` |
| `autocomplete` | `AutocompleteField` | `[]` |
| `file` | `FileField` | `[]` |
| `rating` | `RatingField` | `0` |
| `slider` | `SliderField` | `0` |

### Business Rules & Constraints

- **`FieldBase` is an abstract `@Directive`**, not a hook. A `viewChild()`
  declared on it resolves against each **subclass's** template — which is how one
  declaration gives every editor autofocus. React needed a `useAutoFocus` call
  per field.
- **`buildValidators` is the single place declarative config becomes validators**,
  so a schema's `validation` block behaves identically for every type.
- **A type can contribute its own validator.** `email` does:
  ```ts
  ...(type === 'email' ? { buildValidators: () => [Validators.email] } : {})
  ```
  `<input type="email">` validates nothing here — the form is submitted with
  `novalidate`, so the browser's own check never runs.
- **Array-valued renderers write a *new* array, never mutate.** Angular compares
  by reference; an in-place `push` notifies nothing.
- **`emptyValue: []` is a template, not an instance.** `buildDefaultValues`
  copies arrays so two controls never share one.
- **`file` holds real `File` objects**, which is what lets `SchemaForm` switch to
  multipart. The native `<input type="file">` is kept (visually hidden, driven by
  a button) because it is the only element that can open the OS picker — and its
  value cannot be assigned, which is why removing a file clears the element.
- **An unknown type degrades to a text input.**

### Extension Points

**Adding a field type — the whole procedure:**

1. A component extending `FieldBase`, marking its control `#field` for autofocus.
2. One entry in `fields/index.ts`.
3. Nothing else.

> **Trap.** Backticks inside the component's inline `template:`/`styles:`
> comments terminate the template literal. Use double quotes there.
