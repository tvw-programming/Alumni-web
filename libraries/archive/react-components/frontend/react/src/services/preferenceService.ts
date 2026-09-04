import { post } from '@/api/request';

/** Envelope sent to (and echoed back by) the preferences endpoint. */
export interface PreferenceSavePayload<TDraft> {
  sectionId: string;
  preferences: TDraft;
}

export interface PreferenceSaveResponse<TDraft> extends PreferenceSavePayload<TDraft> {
  id?: number;
}

/**
 * Centralized save for every preference section. The endpoint comes from the
 * section's config, so each section (or route) can target its own resource.
 *
 * Returns the server-confirmed draft — callers apply *this* (not the local
 * draft), so any server-side normalization wins.
 *
 * Note: DummyJSON has no real preferences resource; `/users/add` style
 * endpoints echo the posted body back, which stands in for a persistence API.
 */
export async function savePreferences<TDraft>(
  endpoint: string,
  sectionId: string,
  draft: TDraft,
): Promise<TDraft> {
  const response = await post<PreferenceSaveResponse<TDraft>, PreferenceSavePayload<TDraft>>(
    endpoint,
    { sectionId, preferences: draft },
  );
  return response.preferences ?? draft;
}
