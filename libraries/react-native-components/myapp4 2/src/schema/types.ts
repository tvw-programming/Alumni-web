import { z } from 'zod';

/**
 * Layer 3 — Screen schema (SDUI).
 *
 * Everything the server can say is enumerated here. Note what is NOT in the
 * schema: easing curves, durations, regexes, URLs to evaluate, or any
 * JavaScript. Only *names* the client already knows how to resolve.
 */

/** The highest schema version this build understands. */
export const SUPPORTED_SCHEMA_VERSION = 3;

export const enteringPresetSchema = z.enum(['fade', 'slideUp', 'slideRight', 'scale']);

export const actionSchema = z.object({
  /** Named action IDs resolved client-side — never code from the server. */
  type: z.enum(['NAVIGATE', 'OPEN_SHEET', 'ADD_TO_CART', 'TOAST', 'REFRESH', 'NOOP']),
  route: z.string().optional(),
  params: z.record(z.unknown()).optional(),
  message: z.string().optional(),
});
export type SchemaAction = z.infer<typeof actionSchema>;

export const nodeSchema: z.ZodType<SchemaNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.unknown()).optional(),
    dataSource: z.string().optional(),
    actions: z.record(actionSchema).optional(),
    children: z.array(nodeSchema).optional(),
  }),
);

export interface SchemaNode {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  dataSource?: string;
  actions?: Record<string, SchemaAction>;
  children?: SchemaNode[];
}

export const screenSchema = z.object({
  screenId: z.string(),
  /** Client refuses anything newer than SUPPORTED_SCHEMA_VERSION. */
  version: z.number().int().positive(),
  title: z.string().optional(),
  components: z.array(nodeSchema),
});
export type ScreenSchema = z.infer<typeof screenSchema>;

// --- Form schema -----------------------------------------------------------

export const ruleSchema = z.union([
  z.enum(['required', 'email', 'phone', 'numeric', 'positive']),
  z.object({
    name: z.enum(['minLength', 'maxLength', 'min', 'max', 'matches']),
    value: z.union([z.number(), z.string()]),
    message: z.string().optional(),
  }),
]);
export type FieldRule = z.infer<typeof ruleSchema>;

export const fieldTypeSchema = z.enum([
  'text',
  'email',
  'password',
  'phone',
  'currency',
  'otp',
  'rating',
  'chips',
  'segmented',
]);
export type FieldType = z.infer<typeof fieldTypeSchema>;

export const formFieldSchema = z.object({
  name: z.string(),
  type: fieldTypeSchema,
  label: z.string().optional(),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  defaultValue: z.unknown().optional(),
  rules: z.array(ruleSchema).optional(),
  /** Extra props forwarded to the underlying control. */
  props: z.record(z.unknown()).optional(),
  /** Options for chips / segmented controls. */
  options: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
  dependsOn: z.object({ field: z.string(), equals: z.unknown() }).optional(),
});
export type FormFieldSchema = z.infer<typeof formFieldSchema>;

export const formSchema = z.object({
  formId: z.string(),
  version: z.number().int().positive(),
  title: z.string().optional(),
  submitLabel: z.string().optional(),
  fields: z.array(formFieldSchema),
});
export type FormSchema = z.infer<typeof formSchema>;

export interface SchemaParseResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
}

/** Validate before rendering — never trust the payload's shape. */
export const parseScreenSchema = (input: unknown): SchemaParseResult<ScreenSchema> => {
  const result = screenSchema.safeParse(input);
  if (!result.success) return { ok: false, data: null, error: result.error.message };
  if (result.data.version > SUPPORTED_SCHEMA_VERSION) {
    return {
      ok: false,
      data: null,
      error: `Schema v${result.data.version} is newer than this app supports (v${SUPPORTED_SCHEMA_VERSION}).`,
    };
  }
  return { ok: true, data: result.data };
};

export const parseFormSchema = (input: unknown): SchemaParseResult<FormSchema> => {
  const result = formSchema.safeParse(input);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, data: null, error: result.error.message };
};
