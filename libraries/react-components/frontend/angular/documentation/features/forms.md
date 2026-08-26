# Forms

A schema is **plain data**. Adding a field is one object; the engine never
changes.

## Proving the schema is data

Two pages use the same engine, deliberately differently:

- [Product Form](../../src/app/features/product-form/product-form-page.ts) — the
  schema is a TypeScript literal. Convenient, but proves nothing: a schema in
  code could always have been a component.
- [Order Form](../../src/app/features/admin/order-form-page.ts) — the schema is
  [`public/schemas/order-form.json`](../../public/schemas/order-form.json),
  **fetched over HTTP at runtime**. The form renders from bytes the build has
  never seen.

The order form validates its schema on arrival, because it comes from outside
the bundle and "it typechecked" says nothing about it. A malformed schema shows
a message; it does not crash inside the engine where the cause is invisible.

**Verified**: 7 fields plus a switch rendered from the JSON, and the JSON's
`required` rules fire on an empty submit.

## Pieces

| File | Role |
| --- | --- |
| [`form.types.ts`](../../src/app/shared/forms/form.types.ts) | `FormSchema`, `FieldConfig`, validation config |
| [`field-registry.ts`](../../src/app/shared/forms/field-registry.ts) | type → renderer, `buildValidators`, `buildDefaultValues` |
| [`fields/index.ts`](../../src/app/shared/forms/fields/index.ts) | registers the built-in types |
| [`fields/field-shell.ts`](../../src/app/shared/forms/fields/field-shell.ts) | `FieldBase` — shared error text and required state |
| [`schema-form.ts`](../../src/app/shared/forms/schema-form.ts) | builds the `FormGroup`, renders fields, owns submit |
| [`form-helpers.ts`](../../src/app/shared/forms/form-helpers.ts), [`fields/value-coercion.ts`](../../src/app/shared/forms/fields/value-coercion.ts) | ported verbatim from React, with their tests |

Adding a field type is one entry in `fields/index.ts` and one component. The
engine is untouched.

## The validation bug that tests did not catch

The most important thing in this document.

A `FormControl`'s `touched`, `dirty`, `status` and `errors` are **plain
properties, not signals**. A `computed()` reading them evaluates once and never
re-runs. Unit tests passed — they read the control directly — while the browser
showed no validation messages at all.

The fix is to give the `computed` something reactive to depend on:

```ts
private readonly controlEvents = toSignal(
  toObservable(this.control).pipe(switchMap((control) => control.events)),
  { initialValue: null },
);

protected readonly errorText = computed(() => {
  this.controlEvents();                       // the dependency that makes this work
  const control = this.control();
  if (!(control.touched || control.dirty) || control.valid) return null;
  return this.describe(control.errors);
});
```

This is one of the four sanctioned RxJS boundaries. **If you add a component
that derives state from a `FormControl`, it needs this.**

## Renderers take a `control` input, not a `formControlName`

`NgComponentOutlet` instantiates components **outside** the host directive's
injector, so `formControlName` cannot find its parent `FormGroup` — it fails
with NG01050. Every renderer therefore takes the control as an input and binds
`[formControl]`:

```ts
<ng-container
  *ngComponentOutlet="renderer; inputs: { field: field, control: controlFor(field) }" />
```

## Validators

`buildValidators` maps declarative config to Angular validators in one place, so
a schema's `validation` block behaves identically for every field type. A field
*type* can also contribute its own:

```ts
...(type === 'email' ? { buildValidators: () => [Validators.email] } : {})
```

**This one was a real gap.** `<input type="email">` validates nothing here: the
form is submitted with `novalidate`, so the browser's own check never runs. An
`email` field looked validated and was not.

## Submit

`SchemaForm` marks everything touched, and either emits `formSubmit` with the
raw value or emits `invalidSubmit` with the invalid field names — and logs a
`FORM_VALIDATION_BLOCKED` warning to the app channel, which is why blocked
submissions appear in the error console.

> The output is `invalidSubmit`, not `invalid`. `invalid` is a native DOM event
> name, and an output sharing it makes `(invalid)` ambiguous at the call site.
> `@angular-eslint/no-output-native` enforces this.

## Reuse

The contact page uses the engine rather than hand-writing fields. React wrote
three `<TextField>` blocks with per-field Zod schemas; here the same form is
four lines of data, and the validation rules, error text and submit-disabled
behaviour come for free and stay consistent with every other form in the app.
