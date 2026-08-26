/**
 * Same boundary as the other domain libraries — imported JSON widens to
 * `string`, so one assertion here beats casts through thirteen usage files.
 */
export const loadSample = <T,>(raw: unknown): T => raw as T;
