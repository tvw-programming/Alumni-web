import { Validators } from '@angular/forms';

import type { FieldConfig, FieldTypeDefinition, FieldTypeMap, FieldValue } from './form.types';
import type { ValidatorFn } from '@angular/forms';

/**
 * Field types are looked up here rather than hardcoded in a growing `@switch`
 * inside the form component. Two ways to extend, matching the React registry:
 *
 *   1. Globally — `registerFieldType('signature', {...})`, usable from any
 *      schema app-wide.
 *   2. Per form — pass `fieldTypes` to `SchemaForm`; those entries shadow the
 *      global ones.
 *
 * Neither path requires touching the form engine.
 */

const globalRegistry = new Map<string, FieldTypeDefinition>();

export function registerFieldType(type: string, definition: FieldTypeDefinition): void {
  globalRegistry.set(type, definition);
}

export function registerFieldTypes(map: FieldTypeMap): void {
  Object.entries(map).forEach(([type, def]) => { registerFieldType(type, def); });
}

export function unregisterFieldType(type: string): void {
  globalRegistry.delete(type);
}

/** Resolves a type, letting a per-form override win over the global entry. */
export function resolveFieldType(
  type: string,
  overrides?: FieldTypeMap,
): FieldTypeDefinition | undefined {
  return overrides?.[type] ?? globalRegistry.get(type);
}

/**
 * Validators from the declarative config, plus anything the type contributes.
 *
 * Keeping this in one place means a schema's `validation` block behaves
 * identically for every field type.
 */
export function buildValidators(field: FieldConfig, definition?: FieldTypeDefinition): ValidatorFn[] {
  const rules: ValidatorFn[] = [];
  const v = field.validation;

  if (v?.required) rules.push(Validators.required);
  if (v?.minLength !== undefined) rules.push(Validators.minLength(v.minLength));
  if (v?.maxLength !== undefined) rules.push(Validators.maxLength(v.maxLength));
  if (v?.pattern) rules.push(Validators.pattern(v.pattern));
  if (v?.min !== undefined) rules.push(Validators.min(v.min));
  if (v?.max !== undefined) rules.push(Validators.max(v.max));

  return [...rules, ...(definition?.buildValidators?.(field) ?? [])];
}

/**
 * Derives initial values from the schema using each type's `emptyValue`.
 *
 * Hand-maintaining that object drifts: a field added to the schema but missed
 * in the defaults arrives `undefined`, which makes Angular treat the control as
 * having no initial value and breaks `reset()`.
 */
export function buildDefaultValues(
  fields: readonly FieldConfig[],
  overrides: Record<string, FieldValue> = {},
  fieldTypes?: FieldTypeMap,
): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(overrides, field.name)) {
      values[field.name] = overrides[field.name];
      continue;
    }
    const empty = resolveFieldType(field.type, fieldTypes)?.emptyValue;
    // Arrays must not be shared between controls: two fields defaulting to the
    // same array would mutate each other. Copied as `unknown[]` because the
    // element type is whatever the field type declared.
    values[field.name] = Array.isArray(empty) ? ([...(empty as unknown[])] as FieldValue) : empty;
  }
  return values;
}
