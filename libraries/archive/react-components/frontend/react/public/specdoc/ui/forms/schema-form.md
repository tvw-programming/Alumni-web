## Component Specification

### Name & Purpose

`SchemaFormWrapper` — renders a complete form from a schema object. A field is
data, so adding one is a JSON entry rather than a JSX block plus a validator plus
a default.

### Location

`src/components/forms/SchemaFormWrapper.tsx`, `SchemaField.tsx`,
`FormSubmitControls.tsx`, `FormErrorLogger.tsx`, `formHelpers.ts`

### Public Interface

```tsx
export interface SchemaFormWrapperProps {
  schema: FormSchemaV2;
  defaultValues?: FormValues;
  submitButtonLabel?: string;
  /** true → full-page blocking spinner; unset → spinner inside the button */
  blocking?: boolean;
  blockingMessage?: string;
  /** Fallback debounce for onCustomChange; a field's own `debounceMs` wins. */
  defaultDebounceMs?: number;
  /** Field types for this form only, shadowing the global registry.
   *  Must be a stable reference — a fresh literal each render defeats
   *  memoization inside SchemaField. */
  fieldTypes?: FieldTypeMap;
  /** Recorded in the error log so entries are traceable to a source. */
  sourceFile?: string;
  formName?: string;
  apiEndpoint?: string | null;
  httpMethod?: string | null;
}
export function SchemaFormWrapper(props: SchemaFormWrapperProps): JSX.Element;
export default SchemaFormWrapper;

// formHelpers.ts — framework-free, ported verbatim to Angular
export function fieldErrorText(errors: unknown[]): string | undefined;
```

### Dependencies

- Internal: `fields/registry`, `fields/valueCoercion`, `utils/errorLogger`.
- External: `@tanstack/react-form`, MUI, `zod` (per-field schemas at the call site).

### Data Models

```ts
interface FormSchemaV2 {
  fields: FieldConfig[];
  onSubmit?: string; // handler name, resolved by the page
  onError?: string;
}
```

The canonical instance is
[`src/schemas/productSchema.json`](../../src/schemas/productSchema.json) — 21
fields, rendered by both frontends and mirrored by the `products` table.

### Business Rules & Constraints

- **The schema is data.** `productSchema.json` is loaded as JSON; nothing about
  it is TypeScript-only. That is what lets the Angular app render the same form.
- **Submission is blocked when invalid, and the block is logged.**
  `FormErrorLogger` writes a `FORM_VALIDATION_BLOCKED` warning to the `app`
  channel with the invalid field names, which is why blocked submits appear in
  the error console.
- **`fieldTypes` shadows the global registry for one form only** — a page can
  drop in a bespoke renderer without registering it app-wide. It must be a stable
  reference.
- **Values are coerced at the field boundary** (`valueCoercion.ts`), so a number
  input yields a number and an empty optional yields `''`, not `NaN` or
  `undefined`.
- **Empty string means "untouched"**, not "clear this". A JSON body strips empty
  values before sending; see the products service.

### Extension Points

- **A new field in an existing form:** one object in the schema.
- **A new field _type_:** see [`field-registry.md`](field-registry.md).
- **A form-wide behaviour** (autosave, dirty-tracking): add to
  `SchemaFormWrapper`; every schema form gains it.
- **Per-field custom logic:** `customOverride` on the field config —
  `onCustomChange`, `onCustomBlur`, `styling`, `htmlAttributes`.
