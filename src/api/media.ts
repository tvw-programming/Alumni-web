/**
 * Media endpoints.
 *
 * Read URLs are requested in batches for a window of the gallery rather than
 * one at a time: signing is a round trip, and a gallery that signs per slide
 * spends the whole scroll waiting.
 */
import { api } from '~/api/client';
import { mediaFixtures, fixtureImageUrl } from '~/mocks/fixtures';

export const USING_FIXTURES = import.meta.env.VITE_USE_FIXTURES !== 'false';

export interface MediaItem {
  id: number;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4';
  caption: string | null;
  width: number | null;
  height: number | null;
}

export async function fetchMedia(alumniId: number): Promise<MediaItem[]> {
  if (USING_FIXTURES) return mediaFixtures;
  const { data } = await api.get<MediaItem[]>(`/alumni/${alumniId}/media`);
  return data;
}

/** Signed read URLs, keyed by media id. */
export async function fetchMediaUrls(
  alumniId: number,
  ids: number[],
): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  if (USING_FIXTURES) {
    return Object.fromEntries(ids.map((id) => [id, fixtureImageUrl(id)]));
  }
  const { data } = await api.post<Record<number, string>>(`/alumni/${alumniId}/media/urls`, { ids });
  return data;
}

export interface UploadGrant {
  mediaId: number;
  uploadUrl: string;
  headers: Record<string, string>;
}

export async function requestUploadGrant(
  contentType: string,
  sizeBytes: number,
  caption: string,
): Promise<UploadGrant> {
  const { data } = await api.post<UploadGrant>('/media/uploads', { contentType, sizeBytes, caption });
  return data;
}
