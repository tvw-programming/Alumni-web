/**
 * Same boundary as the fintech library: imported JSON widens to `string`, so one
 * assertion here beats casts scattered through twelve usage files. In the real
 * app this boundary is a Zod parse of the API response.
 */
export const loadSample = <T,>(raw: unknown): T => raw as T;
