// components/forms/fields/registry.ts
//
// Field types are looked up here rather than hardcoded in a growing if/else
// chain inside SchemaField. Two ways to extend:
//
//   1. Globally, at module load — `registerFieldType('signature', {...})`.
//      The new type is then usable from any JSON schema, app-wide.
//   2. Per form, at render time — pass `fieldTypes={{ signature: {...} }}` to
//      the schema form wrapper. Per-form entries shadow global ones.
//
// Neither path requires touching SchemaField.

import type { FieldTypeDefinition, FieldTypeMap } from './types';

const globalRegistry = new Map<string, FieldTypeDefinition>();

/** Registers (or replaces) one field type. */
export function registerFieldType(type: string, definition: FieldTypeDefinition): void {
  globalRegistry.set(type, definition);
}

/** Bulk variant of `registerFieldType`. */
export function registerFieldTypes(map: FieldTypeMap): void {
  Object.entries(map).forEach(([type, def]) => registerFieldType(type, def));
}

export function unregisterFieldType(type: string): void {
  globalRegistry.delete(type);
}

/**
 * Resolves a type, letting a per-form override win over the global entry.
 */
export function resolveFieldType(
  type: string,
  overrides?: FieldTypeMap,
): FieldTypeDefinition | undefined {
  return overrides?.[type] ?? globalRegistry.get(type);
}

/** Every currently known type name — handy for diagnostics. */
export function getRegisteredFieldTypes(): string[] {
  return Array.from(globalRegistry.keys()).sort();
}
