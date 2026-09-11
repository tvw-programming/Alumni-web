/**
 * The one axios instance every call goes through.
 *
 * Two interceptors, both there to stop the same class of bug: a request that
 * forgets its token, and a 401 that surfaces as a component crash instead of a
 * sign-in prompt.
 */
import axios, { AxiosError } from 'axios';

import { currentIdToken, signOutEverywhere } from '~/lib/firebase';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20_000,
});

// Attach the Firebase ID token. Async interceptor on purpose: getIdToken may
// need to refresh, and doing it here means no caller has to remember to await
// a token before every request.
api.interceptors.request.use(async (config) => {
  const token = await currentIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 401 here means the API rejected a token the SDK still considers valid —
    // revoked, or the account disabled. Clearing local auth is what turns that
    // into a sign-in prompt rather than a component that retries forever.
    if (error.response?.status === 401) {
      await signOutEverywhere().catch(() => undefined);
    }
    return Promise.reject(error);
  },
);

/** Uploads go straight to Cloud Storage, so they must NOT carry our token. */
export async function putToSignedUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
): Promise<void> {
  // Bare axios, not `api`: the instance above would attach an Authorization
  // header, and Google rejects a signed URL that arrives with credentials it
  // did not expect — the signature covers the headers.
  await axios.put(url, file, { headers, timeout: 120_000 });
}
