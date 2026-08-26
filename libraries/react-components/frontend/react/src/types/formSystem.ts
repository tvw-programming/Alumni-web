import type React from 'react';

/**
 * Ported from the schema-driven form system (originally built on
 * react-hook-form). Kept form-library-agnostic on purpose: nothing in this
 * file references `@tanstack/react-form` or any other engine, so the field
 * renderers built on top of it never need to change when the underlying form
 * engine does.
 *
 * Field types the schema renderer knows how to draw out of the box.
 * Anything outside this list needs a `customRender` on the field config.
 */
export type BuiltInFieldType =
  // passthrough — plain <input type="..."> behind a TextField
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'color'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week'
  // dedicated components
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'toggle'
  | 'checkbox'
  | 'switch'
  | 'checkboxGroup'
  | 'autocomplete'
  | 'slider'
  | 'rating'
  | 'file';

/**
 * `(string & {})` keeps editor autocomplete for the built-ins while still
 * accepting any type registered at runtime via `registerFieldType`.
 */
export type FieldType = BuiltInFieldType | (string & {});

/** Shared configuration for the option-based types. */
export interface ChoiceFieldOptions {
  /** Lay options out horizontally (radio / checkboxGroup). */
  row?: boolean;
  /** Multi-value mode (select, autocomplete, toggle). */
  multiple?: boolean;
  /** Allow values outside `options` — turns autocomplete into a tag input. */
  freeSolo?: boolean;
  /** Collapse tags beyond this count. -1 shows all. */
  limitTags?: number;
  minSelected?: number;
  maxSelected?: number;
}

export interface SliderFieldOptions {
  min?: number;
  max?: number;
  step?: number;
  marks?: boolean | { value: number; label: string }[];
  /** Suffix shown next to the current value, e.g. "%" or " kg". */
  unit?: string;
}

/**
 * Configuration for `type: 'file'` fields.
 *
 * The field's value is always `File[]` — even when `multiple` is false, in
 * which case the array holds at most one entry.
 */
export interface FileFieldOptions {
  /**
   * Allowed types, using the same tokens as the native `accept` attribute:
   * extensions (".pdf"), wildcard groups ("image/*") or exact MIME types
   * ("application/pdf"). Omit to allow anything.
   */
  accept?: string[];
  /** Allow selecting more than one file. Defaults to false. */
  multiple?: boolean;
  /** Per-file size ceiling, in megabytes. */
  maxFileSizeMb?: number;
  /** Combined size ceiling across all selected files, in megabytes. */
  maxTotalSizeMb?: number;
  /** Maximum number of files (only meaningful when `multiple` is true). */
  maxFiles?: number;
  /** Minimum number of files required. */
  minFiles?: number;
  /** Render image thumbnails for image files. Defaults to true. */
  showPreview?: boolean;
  /** Enable drag & drop on the drop area. Defaults to true. */
  dropzone?: boolean;
  /** Static hint shown under the control when there is no error. */
  helperText?: string;
}

/**
 * A form field's value.
 *
 * `unknown` rather than a union of the shapes the built-in renderers use:
 * field configs are JSON resolved at runtime, and `customRender` lets a schema
 * author supply a widget with any value shape at all. Narrow at the point of
 * use — `src/components/forms/fields/valueCoercion.ts` has helpers for the
 * common controls.
 */
export type FieldValue = unknown;

/** One form's data, keyed by field name. */
export type FormValues = Record<string, FieldValue>;

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: FieldValue) => boolean | string;
}

export interface FieldCustomOverride {
  styling?: React.CSSProperties;
  htmlAttributes?: Record<string, FieldValue>;
  /**
   * Resolved validator. In JSON schemas this is authored as a string key and
   * swapped for the real function by the parent's handler registry.
   */
  validation?: (value: FieldValue) => boolean | string | Promise<boolean | string>;
  onCustomChange?: (value: FieldValue) => void;
  onCustomBlur?: (value: FieldValue) => void;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  validation?: FieldValidation;
  asyncValidation?: (value: string) => Promise<boolean | string>;
  customOverride?: FieldCustomOverride;
  options?: { value: string; label: string }[];
  /**
   * Debounce (ms) applied ONLY to the consumer-facing `onCustomChange` side
   * effect. The form's own state update is never debounced — that would make
   * the input lag behind the keystroke.
   *
   * Falls back to the wrapper's `defaultDebounceMs` prop when omitted.
   */
  debounceMs?: number;
  /** textarea only — visible rows. Defaults to 4. */
  rows?: number;
  /** rating only — number of stars. Defaults to 5. */
  max?: number;
  /** rating only — allow 0.5 increments. */
  precision?: number;
  /** file only — upload constraints. */
  file?: FileFieldOptions;
  /** select / multiselect / radio / toggle / checkboxGroup / autocomplete. */
  choice?: ChoiceFieldOptions;
  /** slider only — bounds and step. */
  slider?: SliderFieldOptions;
}

export interface FieldRenderProps {
  field: FieldConfig;
  value: FieldValue;
  /** Validation message, or undefined while the field is valid. */
  error?: string;
  onChange: (value: FieldValue) => void;
  onBlur: () => void;
  isSubmitting: boolean;
}

export interface FormSchema {
  fields: FieldConfig[];
  onSubmit: (data: FormValues) => void | Promise<void>;
  /** Receives an AppError from a failed submit, or `{ invalidFields }`
   *  when the engine blocked submission. Narrow with `isAppError` /
   *  `extractInvalidFields`. */
  onError?: (errors: unknown) => void;
}

/**
 * V2 adds a per-field escape hatch: a render function that takes complete
 * control of the field, for widgets outside the built-in `FieldType` union.
 */
export interface FieldConfigV2 extends FieldConfig {
  customRender?: (props: FieldRenderProps) => React.ReactNode;
}

export interface FormSchemaV2 {
  fields: FieldConfigV2[];
  onSubmit: (data: FormValues) => void | Promise<void>;
  /** Receives an AppError from a failed submit, or `{ invalidFields }`
   *  when the engine blocked submission. Narrow with `isAppError` /
   *  `extractInvalidFields`. */
  onError?: (errors: unknown) => void;
}

/* ------------------------------------------------------------------ */
/* Error log                                                           */
/* ------------------------------------------------------------------ */

/**
 * The log model moved to `types/errorLog.ts` when the log grew channels
 * (api / app / test) and monitoring metadata. Re-exported here so form-system
 * call sites keep their existing import.
 */
export type { ErrorLogEntry, ErrorLogInput, ErrorLogLevel } from './errorLog';
