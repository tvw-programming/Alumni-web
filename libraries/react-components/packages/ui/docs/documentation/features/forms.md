# Schema-driven forms

> Evidence-based. Claims are labelled **Implemented** / **Inferred** /
> **Recommended** / **Limitation** / **Needs product input**. Unlabelled claims
> are Implemented. See [../README.md](../README.md).

---

## 1. Overview

A form in this codebase is **data, not JSX**. A `FormSchemaV2` — an array of
field configs plus `onSubmit`/`onError` — is handed to `SchemaFormWrapper`, which
renders every control, wires validation, debounces side effects, manages submit
state and logs failures.

Three layers, each with one job:

| Layer                                                  | Knows about                       | Does not know about                       |
| ------------------------------------------------------ | --------------------------------- | ----------------------------------------- |
| **Schema** (`FormSchemaV2`)                            | field names, types, labels, rules | React, the form engine, MUI               |
| **Engine bridge** (`SchemaFormWrapper`, `SchemaField`) | `@tanstack/react-form`            | how any individual control looks          |
| **Renderers** (`fields/*.tsx`)                         | MUI, one control each             | the form engine, validation orchestration |

The payoff is concentrated at the bridge. Field renderers never import the form
library: `SchemaField` hands them an already-wired `value`/`onChange` pair. The
header comment in `SchemaFormWrapper.tsx` records that this survived a real
migration — the form was ported from react-hook-form, and _only the four bridge
files changed_. Every renderer in `./fields/*` was untouched.

### Business purpose

**Needs product input.** Two working forms exist (Product, Order), but whether
schema-driven forms are a product requirement or an architectural preference is
not something code can answer.

### Intended users

Both form pages sit under `/admin/master-data`, which is an **internal component
showcase** (decided). Audience: developers building forms in this codebase.

---

## 2. Entry points

### Routes

| Path                              | Component                      | Evidence                         |
| --------------------------------- | ------------------------------ | -------------------------------- |
| `/admin/master-data/product-form` | `ProductForm` (default export) | `frontend/react/src/routes/router.tsx` |
| `/admin/master-data/order-form`   | `OrderForm` (default export)   | `frontend/react/src/routes/router.tsx` |

Both are lazy route modules. Sidebar entries live in
`frontend/react/src/routes/navigation.tsx` as "Product Form (schema demo)" and
"Order Form (schema demo)".

### Public API

| Export                                         | From                                     | Purpose                              |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| `SchemaFormWrapper`                            | `components/forms/SchemaFormWrapper.tsx` | Render a schema                      |
| `registerFieldType` / `registerFieldTypes`     | `components/forms/fields/registry.ts`    | Add a field type app-wide            |
| `unregisterFieldType` / `resolveFieldType`     | same                                     | Manage / look up types               |
| `buildDefaultValues`                           | `components/forms/fields/index.ts`       | Derive `defaultValues` from a schema |
| `fieldErrorText` / `extractInvalidFields`      | `components/forms/formHelpers.ts`        | Normalise engine output              |
| `FieldRendererProps`, `FieldTypeDefinition`, … | `components/forms/fields/types.ts`       | Renderer contract                    |

---

## 3. User flows

### Primary — fill and submit

1. Page builds a schema (`useMemo`) and renders `SchemaFormWrapper`.
2. Wrapper derives `defaultValues` and mounts one `SchemaField` per entry.
3. User types. **Form state updates immediately**; only the consumer's
   `onCustomChange` side effect is debounced.
4. Sync validators run on change; async validators run debounced.
5. Submit → `schema.onSubmit(values)` → mutation → snackbar.

### Alternate — blocked submission

If a required field is empty, the engine blocks and calls `schema.onError` with
`{ invalidFields: string[] }`. `extractInvalidFields` narrows that safely, and
the page reports which fields failed.

### Alternate — async field validation

`asyncValidation` (e.g. "is this SKU free?") runs on a debounce derived from the
field's own `debounceMs`, falling back to 300ms.

### Alternate — blocking submit

`blocking` swaps the in-button spinner for a full overlay, for submits where
further interaction would be wrong.

### Failure — API rejects

`onSubmit` throws a normalised `AppError`; the page's `onError` renders it. The
form stays filled — nothing is cleared on failure.

### Failure — unresolved handler name

A JSON schema referencing `"validation": "descriptionValidation"` when nothing is
registered under that name logs `SCHEMA_HANDLER_UNRESOLVED` at warning level and
drops the handler, rather than crashing the form.

---

## 4. Architecture

```
ProductForm / OrderForm                      ← page: JSON schema + handler registry
   │  FormSchemaV2 { fields, onSubmit, onError }
   ▼
SchemaFormWrapper                            ← engine bridge; owns useForm()
   ├── FormErrorLogger      (renders null)   ← watches fieldMeta, writes to the log
   ├── SchemaField × N      (memoised)       ← per-field engine wiring
   │      └── definition.render              ← the renderer, engine-agnostic
   └── FormSubmitButton / BlockingSubmitOverlay
              ▲
       fields/registry.ts                    ← type → { render, buildValidators, emptyValue }
```

### Responsibility boundaries

| Concern                        | Owner                                     |
| ------------------------------ | ----------------------------------------- |
| What fields exist              | Page (schema / JSON)                      |
| Engine wiring                  | `SchemaFormWrapper` + `SchemaField`       |
| Drawing a control              | `fields/*.tsx`                            |
| Which component renders a type | `fields/registry.ts`                      |
| Validation orchestration       | `SchemaField`                             |
| Validation _rules_             | Schema, plus the type's `buildValidators` |
| Default values                 | `buildDefaultValues`                      |
| Submit state / overlay         | `FormSubmitControls`                      |
| Logging validation failures    | `FormErrorLogger`                         |
| Calling the API                | Page's `onSubmit`                         |

### Files

| File                      | Lines    | Role                                           |
| ------------------------- | -------- | ---------------------------------------------- |
| `SchemaFormWrapper.tsx`   | 144      | Owns `useForm`, renders fields and submit row  |
| `SchemaField.tsx`         | 241      | Per-field wiring, validators, debounce; `memo` |
| `FormErrorLogger.tsx`     | 97       | Null-rendering watcher → error log             |
| `FormSubmitControls.tsx`  | 86       | Submit button, blocking overlay, row           |
| `formHelpers.ts`          | 39       | `fieldErrorText`, `extractInvalidFields`       |
| `fields/registry.ts`      | ~45      | Global + per-form type resolution              |
| `fields/index.ts`         | ~110     | Registers built-ins; `buildDefaultValues`      |
| `fields/types.ts`         | 57       | `FieldRendererProps`, `FieldTypeDefinition`    |
| `fields/valueCoercion.ts` | ~90      | 8 `unknown` → concrete coercions               |
| `fields/*.tsx`            | 14 files | One control each, all `memo`                   |

---

## 5. Component hierarchy

```
<Container maxWidth="sm">
  <FormErrorLogger form={form} … />              → null
  <Box component="form" noValidate onSubmit>
      <SchemaField … />   × schema.fields.length
          └── <form.Field name validators>
                └── definition.render  →  e.g. <TextInputField>
                                              └── <FieldShell>
                                                    └── MUI control
      <SubmitRow>
        <FormSubmitButton form label blocking />
  {blocking && <BlockingSubmitOverlay form message />}
```

`FieldShell` gives every renderer the same label/helper-text/error layout, so a
new field type inherits the house style without copying markup.

---

## 6. Data and event flow

### Schema → rendered form

```
JSON (productSchema.json)
   → RAW_FIELDS as FieldConfigV2[]
   → resolveFields(RAW_FIELDS, registry)     string handler names → real functions
   → useMemo<FormSchemaV2>
   → SchemaFormWrapper
   → buildDefaultValues(fields, overrides)   per-type emptyValue
   → useForm({ defaultValues, onSubmit })
   → SchemaField per field
   → resolveFieldType(type, fieldTypes)      per-form override ?? global registry
   → definition.render(props)
```

### Keystroke

```
User types
  → renderer onChange(value)
  → fieldApi.handleChange(value)      immediate, never debounced
  → sync validators                   buildSyncValidator
  → async validators (debounced)      buildAsyncValidator
  → debouncedCustomChange(value)      the consumer's side effect only
```

The split is deliberate and commented in `formSystem.ts`:

> Debounce (ms) applied ONLY to the consumer-facing `onCustomChange` side
> effect. The form's own state update is never debounced — that would make the
> input lag behind the keystroke.

### Submit

```
submit → form.handleSubmit()
  → all validators
  → valid?   schema.onSubmit(values) → mutation → invalidateQueries → snackbar
  → invalid? schema.onError({ invalidFields }) → extractInvalidFields → message
```

### Validation errors → the durable log

`FormErrorLogger` subscribes to `fieldMeta` and writes each new error to the
app-wide log, so validation failures show up in the admin error console next to
API and runtime failures.

---

## 7. Public component API

### `SchemaFormWrapperProps`

| Prop                         | Type             | Default    | Notes                                                                    |
| ---------------------------- | ---------------- | ---------- | ------------------------------------------------------------------------ |
| `schema`                     | `FormSchemaV2`   | —          | **Required.** Memoise it.                                                |
| `defaultValues`              | `FormValues`     | derived    | Overrides on top of `buildDefaultValues`.                                |
| `submitButtonLabel`          | `string`         | `'Submit'` |                                                                          |
| `blocking`                   | `boolean`        | `false`    | Full-page overlay instead of button spinner.                             |
| `blockingMessage`            | `string`         | —          |                                                                          |
| `defaultDebounceMs`          | `number`         | `0`        | Per-field `debounceMs` wins.                                             |
| `fieldTypes`                 | `FieldTypeMap`   | —          | Per-form types, shadowing the global registry. **Pass a stable object.** |
| `sourceFile`                 | `string`         | —          | Recorded in the log for traceability.                                    |
| `formName`                   | `string`         | —          |                                                                          |
| `apiEndpoint` / `httpMethod` | `string \| null` | —          | Recorded on logged failures.                                             |

### `FieldConfigV2`

| Field             | Type                                                                    | Purpose                                                                                     |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `name`            | `string`                                                                | Key in `FormValues`                                                                         |
| `label`           | `string`                                                                | Visible label                                                                               |
| `type`            | `FieldType`                                                             | Registry key — `BuiltInFieldType \| (string & {})`, so a custom type is still autocompleted |
| `required`        | `boolean`                                                               |                                                                                             |
| `placeholder`     | `string`                                                                |                                                                                             |
| `validation`      | `{ minLength, maxLength, pattern, custom }`                             | Sync rules                                                                                  |
| `asyncValidation` | `(value: string) => Promise<boolean \| string>`                         | Remote check; text only                                                                     |
| `customOverride`  | `{ styling, htmlAttributes, validation, onCustomChange, onCustomBlur }` | Per-field escape hatches                                                                    |
| `options`         | `{ value, label }[]`                                                    | Choice types                                                                                |
| `debounceMs`      | `number`                                                                | Side-effect debounce                                                                        |
| `rows`            | `number`                                                                | textarea                                                                                    |
| `customRender`    | `(props: FieldRenderProps) => ReactNode`                                | Bypass the registry entirely                                                                |

### `FieldRendererProps` — the renderer contract

```ts
export interface FieldRendererProps {
  field: FieldConfigV2;
  value: FieldValue; // `unknown`, narrowed by the renderer
  error?: string;
  disabled: boolean;
  onChange: (value: FieldValue) => void; // immediate state + debounced side effect
  onBlur: (rawValue?: FieldValue) => void; // touched + onCustomBlur
  name: string;
  inputRef: React.Ref<HTMLInputElement>;
  attrs: FieldAttributes; // merged htmlAttributes
}
```

`value` is `unknown` on purpose. Schemas are authored in JSON, so a renderer
cannot be handed a guaranteed type — it must narrow. `valueCoercion.ts` provides
the eight narrowings the built-ins use.

### `FieldTypeDefinition`

```ts
export interface FieldTypeDefinition {
  render: React.ComponentType<FieldRendererProps>;
  buildValidators?: (field: FieldConfigV2) => ValidatorMap;
  emptyValue?: FieldValue;
}
```

`buildValidators` lets a type contribute rules ("at least one star", file size
limits) **without `SchemaField` knowing they exist**.

---

## 8. Built-in field types

Registered in `fields/index.ts`:

| Type(s)                                                                                                                   | Renderer                          | `emptyValue` | Own validators |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------ | -------------- |
| `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `color`, `date`, `time`, `datetime-local`, `month`, `week` | `TextInputField`                  | `''`         | —              |
| `textarea`                                                                                                                | `TextareaField`                   | `''`         | —              |
| `select`                                                                                                                  | `SelectField`                     | `''`         | ✓              |
| `multiselect`                                                                                                             | `SelectField` (`multiple` forced) | `[]`         | ✓              |
| `radio`                                                                                                                   | `RadioGroupField`                 | `''`         | —              |
| `toggle`                                                                                                                  | `ToggleGroupField`                | `''`         | —              |
| `checkbox`                                                                                                                | `CheckboxField`                   | `false`      | ✓              |
| `switch`                                                                                                                  | `SwitchField`                     | `false`      | —              |
| `checkboxGroup`                                                                                                           | `CheckboxGroupField`              | `[]`         | ✓              |
| `autocomplete`                                                                                                            | `AutocompleteField`               | `''`         | ✓              |
| `slider`                                                                                                                  | `SliderField`                     | `0`          | —              |
| `rating`                                                                                                                  | `RatingField`                     | `0`          | ✓              |
| `file`                                                                                                                    | `FileUploadField`                 | `[]`         | ✓              |

Thirteen HTML input types share one renderer — they differ only by the `type`
attribute, so a separate component each would be duplication.

---

## 9. Usage examples

### Minimal

```tsx
const schema = useMemo<FormSchemaV2>(
  () => ({
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
    ],
    onSubmit: async (values) => {
      await save(values);
    },
  }),
  [],
);

<SchemaFormWrapper schema={schema} submitButtonLabel="Save" />;
```

### JSON schema with named handlers

```tsx
const RAW_FIELDS = productSchemaJson.fields as unknown as FieldConfigV2[];

const registry = useMemo<HandlerRegistry>(
  () => ({ descriptionValidation, handleDescriptionChange, handleDescriptionBlur }),
  [descriptionValidation, handleDescriptionChange, handleDescriptionBlur],
);

const fields = useMemo(() => resolveFields(RAW_FIELDS, registry), [registry]);
```

JSON cannot hold functions, so it holds _names_. `resolveFields` swaps names for
functions and warns on an unresolved one — a JSON typo becomes a log entry, not a
crash.

### Defaults derived from the schema

```tsx
const DEFAULT_VALUES = buildDefaultValues(RAW_FIELDS, {
  themeColor: '#2196f3',
  warrantyMonths: 12,
});
```

Hand-maintaining that object drifts. A field added to the JSON but missed in the
defaults arrives `undefined`, MUI mounts the input **uncontrolled**, then
switches to controlled on the first keystroke, and React warns.

### A custom field type

```tsx
registerFieldType('signature', {
  render: SignatureField,
  emptyValue: '',
  buildValidators: (field) => ({
    signed: (value) => (field.required && !value ? 'Signature required' : true),
  }),
});
```

Or scoped to one form, shadowing the global entry:

```tsx
const FIELD_TYPES: FieldTypeMap = { signature: { render: MySignature, emptyValue: '' } };
<SchemaFormWrapper schema={schema} fieldTypes={FIELD_TYPES} />;
```

`FIELD_TYPES` is module-level on purpose — a fresh literal per render defeats
`SchemaField`'s memo. The prop doc says so.

### Wiring submit to a mutation

```tsx
const createProduct = useCreateProduct();

const handleSubmit = useCallback(
  async (data: FormValues) => {
    const created = await createProduct.mutateAsync(toNewProduct(data));
    snackbar.success(`Product "${created.title}" created (id ${created.id})`);
  },
  [createProduct],
);
```

`useCreateProduct` sets `meta.silenceGlobalError` so the form shows its own
error instead of a toast, and invalidates `queryKeys.products.all` on success.

---

## 10. Loading, empty and error behaviour

| State                    | Behaviour                                                |
| ------------------------ | -------------------------------------------------------- |
| Idle                     | Fields render with derived defaults; **no errors shown** |
| Field invalid, untouched | No error — errors appear only after interaction          |
| Field invalid, touched   | `FieldShell` shows `error` + helper text; logged         |
| Async validating         | Engine `isValidating`; debounced ≥300ms                  |
| Submitting (default)     | Spinner inside the submit button; button disabled        |
| Submitting (`blocking`)  | Full-page overlay                                        |
| Submit rejected          | `onError` receives the `AppError`; values preserved      |
| Blocked by validation    | `onError` receives `{ invalidFields }`                   |

`fieldErrorText` flattens whatever the engine produced — a plain string, a
standard-schema issue with `.message`, or something unrecognised (→
`'Invalid value'`) — into one helper-text line. That normalisation is covered by
9 tests in `formHelpers.test.ts`.

---

## 11. Accessibility and responsive behaviour

**Implemented**

- Every control is a real MUI input with a real `<label>`; `FieldShell`
  centralises label/error/helper wiring, so nothing depends on placeholder text
  as a label.
- `noValidate` on the form: native browser bubbles are suppressed in favour of
  in-page messages that screen readers can reach.
- Errors render as MUI helper text tied to the control, giving
  `aria-describedby` and `aria-invalid` from MUI.
- `SchemaFormWrapper.test.tsx:37` asserts fields are reachable **by label**,
  which fails if labelling regresses.
- `Container maxWidth="sm"` keeps line length readable; MUI controls are
  `fullWidth` and stack on narrow viewports.

**Limitation.** No `aria-live` region announces submit success or failure.
Sighted users get a snackbar; a screen-reader user relies on focus landing
somewhere sensible, which is not explicitly managed.
**Recommended:** a polite live region in `SubmitRow` echoing the submit outcome.

**Limitation.** On a blocked submit, focus is **not** moved to the first invalid
field. The message is rendered but the user must find it.
**Recommended:** focus the first entry from `extractInvalidFields`.

---

## 12. Best-practice justification

| Practice                                      | Code evidence                                                         | Justification                                                                                                                 | Trade-off                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Schema as data**                            | `FormSchemaV2`; `productSchema.json`                                  | Forms become configuration; a field is one JSON object, not a JSX block plus a validator plus a default.                      | Loses compile-time checking of the schema; a bad `type` is a runtime miss, mitigated by the registry warning. |
| **Registry over a switch**                    | `resolveFieldType` (`registry.ts:34`)                                 | Adding a type never edits `SchemaField`; the growing `if/else` chain the header comment describes cannot come back.           | Indirection: finding what renders a type means reading the registry.                                          |
| **Per-form override shadows global**          | `overrides?.[type] ?? globalRegistry.get(type)`                       | A page can drop in a bespoke renderer without polluting the app-wide namespace.                                               | Two lookup paths; a type can behave differently in two forms.                                                 |
| **Renderers are engine-agnostic**             | `FieldRendererProps` — no engine types                                | The react-hook-form → TanStack migration changed 4 bridge files and **zero renderers**.                                       | The bridge is denser; `SchemaField` is the largest file in the feature.                                       |
| **Debounce the side effect, never the state** | `useDebouncedCallback(customOverride?.onCustomChange, debounceMs)`    | Typing stays instant while expensive consumer work is throttled.                                                              | Two timings to reason about.                                                                                  |
| **Derived defaults**                          | `buildDefaultValues`                                                  | Prevents the uncontrolled→controlled switch React warns about.                                                                | Every type must declare a sensible `emptyValue`.                                                              |
| **`FieldValue = unknown`**                    | `fields/types.ts`                                                     | JSON-authored values _are_ unknown; forcing narrowing at the renderer is honest.                                              | Every renderer narrows — hence `valueCoercion.ts`.                                                            |
| **Focused memoisation**                       | `memo(SchemaField)`; all 14 renderers `memo`; validators in `useMemo` | Typing in one field re-renders that field, not the whole form.                                                                | Requires stable `field` objects — hence `useMemo` on the schema in pages.                                     |
| **Store selectors, not whole-form reads**     | `useStore(form.store, (s) => s.isSubmitting)`                         | The submit button re-renders on submit state only, not on every keystroke.                                                    | Each consumer writes its own selector.                                                                        |
| **Validation failures are logged**            | `FormErrorLogger`                                                     | Validation problems land in the same console as API and render failures, so a confusing form is visible without a bug report. | Extra null-rendering component per form.                                                                      |
| **Typed narrowing over casts**                | `extractInvalidFields` filters `typeof field === 'string'`            | Replaces `errors.invalidFields as string[]`, which would hand non-strings to the UI.                                          | A few lines instead of one cast.                                                                              |
| **Custom render escape hatch**                | `FieldConfigV2.customRender`                                          | A one-off widget never forces a registry entry.                                                                               | Bypasses validation orchestration; the caller owns everything.                                                |

---

## 13. Testing

| File                            | Tests | Covers                                                                                                      |
| ------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| `SchemaFormWrapper.test.tsx`    | 4     | A control per field; **every field starts controlled**; typed values reach `onSubmit`; required-field block |
| `formHelpers.test.ts`           | 14    | `extractInvalidFields` (4 shapes incl. non-string entries), `fieldErrorText` (5 shapes)                     |
| `fields/valueCoercion.test.ts`  | 44    | All 8 coercions across null/undefined/wrong-type/edge inputs                                                |
| `fields/TextareaField.test.tsx` | 7     | `attrs.rows` narrowing, precedence, error state, null → `''`                                                |

**69 tests.** The "starts controlled" test is the direct guard on
`buildDefaultValues`; the coercion suite is the guard on `FieldValue = unknown`.

```bash
cd frontend/react
pnpm exec vitest run src/components/forms   # 69 tests
```

**Limitation.** Only 2 of 14 renderers have dedicated tests (`TextareaField`,
plus coverage of the rest via coercion). `FileUploadField` (454 lines, drag/drop,
previews, object-URL lifecycle) is the largest untested renderer.
**Recommended:** a test for `FileUploadField`'s object-URL cleanup, which is a
real leak risk.

**Limitation.** No test asserts the async-validation debounce timing.

---

## 14. Limitations and trade-offs

| #   | Limitation                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`FieldValue` is `unknown` everywhere.** Honest, but every renderer narrows and a schema typo surfaces at runtime.                                                                   |
| 2   | **JSON schemas are not validated against a schema.** `productSchemaJson.fields as unknown as FieldConfigV2[]` is an unchecked assertion. **Recommended:** a Zod parse at module load. |
| 3   | **Handler references are resolved per page.** `resolveFields` is duplicated in `ProductForm` and `OrderForm` rather than shared.                                                      |
| 4   | **`fieldTypes` must be referentially stable**, enforced only by a doc comment.                                                                                                        |
| 5   | **No focus management on blocked submit** (§11).                                                                                                                                      |
| 6   | **No live region for submit outcome** (§11).                                                                                                                                          |
| 7   | **`asyncValidation` is text-only** by signature; other types need `customOverride.validation`.                                                                                        |
| 8   | **One form per wrapper.** No support for nested/array field groups (repeatable rows).                                                                                                 |
| 9   | **`Container maxWidth="sm"` is baked in.** A wide two-column form needs a different wrapper.                                                                                          |
| 10  | **`buildValidators` is registry-only**, so a per-form `fieldTypes` entry must re-declare its validators.                                                                              |

---

## 15. Extension guide

### Add a field to an existing form

Add one object to the JSON — that is all:

```json
{
  "name": "sku",
  "label": "SKU",
  "type": "text",
  "required": true,
  "validation": { "minLength": 3, "maxLength": 32 }
}
```

`buildDefaultValues` picks up the default from the type's `emptyValue`.

### Add a new field type (app-wide)

1. Write the renderer against `FieldRendererProps`; use `FieldShell` for the
   label/error chrome and `valueCoercion` to narrow `value`.
2. Export a `buildValidators` if the type has its own rules.
3. Register it in `fields/index.ts` with an `emptyValue`.
4. `export default memo(MyField);`

`SchemaField` is not touched.

### Add a per-form type

```tsx
const FIELD_TYPES: FieldTypeMap = { signature: { render: SignatureField, emptyValue: '' } };
<SchemaFormWrapper schema={schema} fieldTypes={FIELD_TYPES} />;
```

Module-level, not inline.

### Add a whole new form page

1. Author the schema (JSON or inline).
2. Build a handler registry if the JSON references handlers by name.
3. `useMemo` the resolved fields and the `FormSchemaV2`.
4. Wire `onSubmit` to a mutation hook that invalidates the right query key.
5. Pass `sourceFile` / `formName` / `apiEndpoint` / `httpMethod` so logged
   failures are traceable.
6. Add the route and the `MASTER_DATA_NAV` entry — one edit gives a sidebar link
   _and_ a voice command.

### Swap the form engine again

Only these change: `SchemaFormWrapper.tsx`, `SchemaField.tsx`,
`FormErrorLogger.tsx`, `FormSubmitControls.tsx`. Renderers, the registry, the
coercions and every schema stay as they are — that is the whole reason the
boundary exists.

---

## 16. Evidence index

| Claim                                | File                                                         | Line           |
| ------------------------------------ | ------------------------------------------------------------ | -------------- |
| Wrapper owns `useForm`               | `frontend/react/src/components/forms/SchemaFormWrapper.tsx`        | 56             |
| Side-effect registration import      | `frontend/react/src/components/forms/SchemaFormWrapper.tsx`        | 14             |
| `fieldTypes` stability requirement   | `frontend/react/src/components/forms/SchemaFormWrapper.tsx`        | 40–46          |
| Renders one `SchemaField` per field  | `frontend/react/src/components/forms/SchemaFormWrapper.tsx`        | 124            |
| `SchemaField` memoised               | `frontend/react/src/components/forms/SchemaField.tsx`              | 241            |
| Type resolution per field            | `frontend/react/src/components/forms/SchemaField.tsx`              | 140            |
| Sync/async validators memoised       | `frontend/react/src/components/forms/SchemaField.tsx`              | 151, 152       |
| Debounce applies to side effect only | `frontend/react/src/components/forms/SchemaField.tsx`              | 148            |
| `unknown` narrowed at one boundary   | `frontend/react/src/components/forms/SchemaField.tsx`              | 169            |
| Registry: register / resolve         | `frontend/react/src/components/forms/fields/registry.ts`           | 18, 34         |
| Per-form override wins               | `frontend/react/src/components/forms/fields/registry.ts`           | 34             |
| Built-ins registered                 | `frontend/react/src/components/forms/fields/index.ts`              | 43–79          |
| `buildDefaultValues`                 | `frontend/react/src/components/forms/fields/index.ts`              | 94             |
| Renderer contract                    | `frontend/react/src/components/forms/fields/types.ts`              | 27             |
| `FieldTypeDefinition`                | `frontend/react/src/components/forms/fields/types.ts`              | 50             |
| Coercion helpers (8)                 | `frontend/react/src/components/forms/fields/valueCoercion.ts`      | 17–79          |
| `fieldErrorText`                     | `frontend/react/src/components/forms/formHelpers.ts`               | 14             |
| `extractInvalidFields` narrowing     | `frontend/react/src/components/forms/formHelpers.ts`               | 32             |
| Validation errors → log              | `frontend/react/src/components/forms/FormErrorLogger.tsx`          | 56, 77         |
| Submit state via selector            | `frontend/react/src/components/forms/FormSubmitControls.tsx`       | 31             |
| JSON handler resolution              | `frontend/react/src/components/ProductForm.tsx`                    | 51             |
| Unresolved-handler warning           | `frontend/react/src/components/ProductForm.tsx`                    | 66             |
| Derived defaults with overrides      | `frontend/react/src/components/ProductForm.tsx`                    | 36             |
| Schema memoised                      | `frontend/react/src/components/ProductForm.tsx`                    | 226            |
| Debounce default wired               | `frontend/react/src/components/ProductForm.tsx`                    | 241            |
| Wrapper tests                        | `frontend/react/src/components/forms/SchemaFormWrapper.test.tsx`   | 37, 46, 53, 74 |
| Helper tests                         | `frontend/react/src/components/forms/formHelpers.test.ts`          | 6–56           |
| Coercion tests                       | `frontend/react/src/components/forms/fields/valueCoercion.test.ts` | —              |
