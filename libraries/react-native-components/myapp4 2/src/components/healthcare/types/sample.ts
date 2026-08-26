/**
 * Same boundary as the other domain libraries: imported JSON widens to
 * `string`, so one assertion here beats casts scattered through the usage
 * files. In production this boundary is a schema validation of the API payload.
 */
export const loadSample = <T,>(raw: unknown): T => raw as T;
