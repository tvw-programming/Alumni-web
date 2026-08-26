// Adds the jest-dom matchers (toBeInTheDocument, toHaveValue, …) to Vitest's
// `expect`. Loaded via `test.setupFiles` in vite.config.ts.
import '@testing-library/jest-dom/vitest';

// Testing Library auto-cleans only when a global `afterEach` exists, which it
// does not here because vite.config.ts sets `test.globals: false`. Unmounting
// explicitly stops a component left mounted by one test from being found by
// the next one's queries. (testing-library/no-manual-cleanup is switched off
// for this directory in eslint.config.js — it assumes the globals:true setup.)
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { setMonitoringSink } from '@/utils/monitoring';

import { installMemoryStorage } from './memoryStorage';

// Must run before any module reads storage at import time.
installMemoryStorage();

afterEach(() => {
  cleanup();
});

// The default monitoring sink writes to the console in dev, which under Vitest
// means every logged error a component produces is printed as test output. A
// no-op sink keeps runs readable; a test that cares about the sink installs its
// own (see errorLogger.test.ts).
beforeEach(() => {
  setMonitoringSink(() => undefined);
});
