/**
 * Sample-payload loader.
 *
 * Imported JSON widens to `string`/`number`, which will not satisfy the union
 * types in these props (`"hero"` becomes `string`). Every `.sample.json` in this
 * folder is authored to match its component's props exactly, so one assertion
 * here beats scattering casts through twelve usage files.
 *
 * In the real app the equivalent boundary is Zod validation on the API response
 * — see `src/schema/types.ts` for that pattern.
 */
export const loadSample = <T,>(raw: unknown): T => raw as T;
