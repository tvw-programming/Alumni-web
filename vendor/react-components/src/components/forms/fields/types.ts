import type { FieldConfigV2, FieldValue } from '@/types/formSystem';
import type React from 'react';

/** Re-exported so renderers can import the whole contract from one module. */
export type { FieldValue } from '@/types/formSystem';

/**
 * Extra attributes merged from `customOverride.htmlAttributes`, ready to
 * spread onto the underlying control.
 *
 * Authored in JSON, so their values cannot be described beyond `unknown`.
 * Reading one still requires narrowing — see `TextareaField`, which parses
 * `attrs.rows` rather than trusting it.
 */
export type FieldAttributes = Record<string, FieldValue>;

/**
 * The contract every field renderer receives.
 *
 * Renderers are plain components — they never touch the form engine
 * directly. `SchemaField` owns the wiring to `@tanstack/react-form` and hands
 * down an already-wired value/onChange pair (with debounce and custom
 * callbacks applied), so a renderer only has to draw a control. This is what
 * lets every renderer below be reused unchanged regardless of which form
 * engine `SchemaField` binds to.
 */
export interface FieldRendererProps {
  field: FieldConfigV2;
  value: FieldValue;
  error?: string;
  disabled: boolean;
  /** Writes to form state immediately, then fires the debounced side effect. */
  onChange: (value: FieldValue) => void;
  /** Marks the field touched and fires `customOverride.onCustomBlur`. */
  onBlur: (rawValue?: FieldValue) => void;
  name: string;
  inputRef: React.Ref<HTMLInputElement>;
  /** Merged `customOverride.htmlAttributes`, ready to spread. */
  attrs: FieldAttributes;
}

export type ValidatorMap = Record<string, (value: FieldValue) => boolean | string>;

/**
 * One entry in the field-type registry.
 *
 * `buildValidators` lets a type contribute its own rules (size limits, "at
 * least one star", …) without SchemaField knowing anything about them.
 */
export interface FieldTypeDefinition {
  render: React.ComponentType<FieldRendererProps>;
  buildValidators?: (field: FieldConfigV2) => ValidatorMap;
  /** Value used when the form supplies no default for this field. */
  emptyValue?: FieldValue;
}

export type FieldTypeMap = Record<string, FieldTypeDefinition>;
