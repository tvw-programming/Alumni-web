import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addBreadcrumb,
  classifySeverity,
  clearBreadcrumbs,
  fingerprint,
  getBreadcrumbs,
  getSessionId,
  newCorrelationId,
  report,
  setMonitoringSink,
  startTransaction,
} from './monitoring';

import type { ErrorLogEntry } from '@/types/errorLog';

const entry = { error: 'X', channel: 'app' } as ErrorLogEntry;

afterEach(() => {
  setMonitoringSink();
  clearBreadcrumbs();
});

describe('monitoring', () => {
  it('produces a stable fingerprint for the same inputs and a different one otherwise', () => {
    expect(fingerprint(['api', 'API_500', '/products'])).toBe(
      fingerprint(['api', 'API_500', '/products']),
    );
    expect(fingerprint(['api', 'API_500', '/products'])).not.toBe(
      fingerprint(['api', 'API_500', '/users']),
    );
    // Absent fields must not shift the hash of the fields that are present.
    expect(fingerprint(['api', 'API_500', null, undefined])).toBe(fingerprint(['api', 'API_500']));
  });

  it('classifies severity by status, kind and level', () => {
    expect(classifySeverity({ status: 503 })).toBe('fatal');
    expect(classifySeverity({ kind: 'chunk' })).toBe('fatal');
    expect(classifySeverity({ kind: 'network' })).toBe('error');
    expect(classifySeverity({ status: 404 })).toBe('warning');
    expect(classifySeverity({ level: 'info' })).toBe('info');
    expect(classifySeverity({})).toBe('error');
  });

  it('keeps the breadcrumb buffer bounded and ordered oldest-first', () => {
    for (let i = 0; i < 40; i += 1) addBreadcrumb('ui', `step ${String(i)}`);

    const trail = getBreadcrumbs();
    expect(trail).toHaveLength(25);
    expect(trail[0].message).toBe('step 15');
    expect(trail[trail.length - 1].message).toBe('step 39');
  });

  it('times a transaction and drops a breadcrumb when it finishes', () => {
    const transaction = startTransaction('GET /products');

    expect(transaction.correlationId).toMatch(/^r-/);
    expect(transaction.elapsed()).toBeGreaterThanOrEqual(0);

    const duration = transaction.finish('failed');
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(getBreadcrumbs().at(-1)?.message).toContain('GET /products failed');
  });

  it('issues a unique correlation id per call', () => {
    expect(newCorrelationId()).not.toBe(newCorrelationId());
  });

  it('keeps one session id for the tab', () => {
    expect(getSessionId()).toBe(getSessionId());
  });

  it('routes reports to the installed sink and swallows a sink that throws', () => {
    const sink = vi.fn();
    setMonitoringSink(sink);
    report(entry);
    expect(sink).toHaveBeenCalledWith(entry);

    setMonitoringSink(() => {
      throw new Error('down');
    });
    expect(() => {
      report(entry);
    }).not.toThrow();
  });
});
