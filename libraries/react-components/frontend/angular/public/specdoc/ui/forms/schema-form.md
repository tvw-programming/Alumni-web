## Component Specification

### Name & Purpose
`SchemaForm` — renders a form from a schema object, over Reactive Forms. The
Angular counterpart of React's `SchemaFormWrapper`.

### Location
`src/app/shared/forms/` — `schema-form.ts`, `field-registry.ts`, `form.types.ts`,
`form-helpers.ts`, `to-form-data.ts`, `fields/`

### Public Interface

```ts
@Component({ selector: 'app-schema-form' })
export class SchemaForm {
  readonly schema = input.required<FormSchema>();
  readonly defaultValues = input<FormValues>({});
  readonly fieldTypes = input<FieldTypeMap>();
  readonly submitting = input(false);

  readonly formSubmit   = output<FormValues>();
  readonly invalidSubmit = output<string[]>();   // NOT `invalid` — see below
}

// to-form-data.ts
export function hasFiles(values: FormValues): boolean;
export function toFormData(values: FormValues): FormData;
export function toJsonBody(values: FormValues): Record<string, unknown>;
```

### Dependencies
- Internal: `field-registry`, `fields/` renderers, `core/errors/error-logger`.
- External: `@angular/forms` (Reactive Forms), Angular Material.

### Data Models

```ts
interface FieldConfig {
  name: string; label: string; type: string;
  placeholder?: string; hint?: string;
  validation?: FieldValidation; options?: readonly FieldOption[];
  rows?: number; step?: number; multiple?: boolean; accept?: string;
  disabled?: boolean;
}
interface FormSchema { fields: readonly FieldConfig[]; submitLabel?: string }
```

Loaded from JSON at runtime by the Order Form
(`public/schemas/order-form.json`) — which is what *demonstrates* rather than
asserts that the schema is data.

### Business Rules & Constraints

**The validation bug that tests did not catch — the most important thing here.**

A `FormControl`'s `touched`, `dirty`, `status` and `errors` are **plain
properties, not signals**. A `computed()` reading them evaluates once and never
re-runs. Unit tests passed while the browser showed no validation messages at
all. The fix gives the `computed` something reactive to depend on:

```ts
private readonly controlEvents = toSignal(
  toObservable(this.control).pipe(switchMap((c) => c.events)), { initialValue: null });

protected readonly errorText = computed(() => {
  this.controlEvents();                    // the dependency that makes this work
  const control = this.control();
  if (!(control.touched || control.dirty) || control.valid) return null;
  return this.describe(control.errors);
});
```

> **If you add a component that derives state from a `FormControl`, it needs
> this.**

**Renderers take the control as an input, not `formControlName`.**
`NgComponentOutlet` instantiates components **outside** the host directive's
injector, so `formControlName` cannot find its parent `FormGroup` — NG01050.

**The output is `invalidSubmit`, not `invalid`.** `invalid` is a native DOM event
name; `@angular-eslint/no-output-native` enforces this.

**File-carrying forms switch transport automatically.** `hasFiles()` decides;
`toFormData` appends arrays as **repeated keys** (what the API's `fromForm`
reads) and never sets `Content-Type` — the browser must set it so the multipart
boundary is included.

**Empty string is absence.** `toJsonBody` strips `''` and empty arrays, so an
untouched optional does not overwrite a stored value.

### Extension Points

- **A new field:** one object in the schema.
- **A new field type:** see [`field-registry.md`](field-registry.md).
- **A schema from an API:** the Order Form does this — validate it on arrival,
  because "it typechecked" says nothing about data from outside the bundle.
