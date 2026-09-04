import type { ValidatorFn } from '@angular/forms';
import type { Type } from '@angular/core';

/**
 * Schema contract, ported from the React app's `FormSchemaV2`.
 *
 * A form is data: an array of field configs plus a submit handler. The engine
 * turns that into a `FormGroup` and a rendered form, so adding a field is one
 * JSON object rather than a JSX block plus a validator plus a default.
 */

/** JSON-authored values cannot be typed more precisely than this. */
export type FieldValue = unknown;
export type FormValues = Record<string, FieldValue>;

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface FieldConfig {
  name: string;
  label: string;
  /** Registry key. Unknown types fall back to a plain text input. */
  type: string;
  placeholder?: string;
  hint?: string;
  validation?: FieldValidation;
  options?: readonly FieldOption[];
  /** textarea only. */
  rows?: number;
  /** slider only. */
  step?: number;
  /** file only: whether more than one file may be chosen. */
  multiple?: boolean;
  /** file only: the `accept` attribute, e.g. 'image/*'. */
  accept?: string;
  disabled?: boolean;
}

export interface FormSchema {
  fields: readonly FieldConfig[];
  submitLabel?: string;
}

/** The contract every field renderer receives. */
export interface FieldRendererInputs {
  field: FieldConfig;
  /** Name of the control inside the parent FormGroup. */
  controlName: string;
}

export interface FieldTypeDefinition {
  render: Type<unknown>;
  /** Value used when the schema supplies no default for this field. */
  emptyValue: FieldValue;
  /** Extra validators contributed by the type itself. */
  buildValidators?: (field: FieldConfig) => ValidatorFn[];
}

export type FieldTypeMap = Record<string, FieldTypeDefinition>;
