/** Dummy HTTP call — replace with a real service call when wiring a backend. */
export function simulateApiCall<T>(result: T, delayMs = 600): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), delayMs);
  });
}
