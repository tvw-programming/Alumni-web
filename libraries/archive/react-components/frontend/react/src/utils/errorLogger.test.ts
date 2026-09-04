import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildLogFile,
  clearLogs,
  countByLevel,
  filterLogs,
  getLogs,
  getLogsByChannel,
  groupByFingerprint,
  logError,
  logInfo,
  logWarning,
  subscribe,
} from './errorLogger';
import { setMonitoringSink } from './monitoring';

import type { ErrorLogEntry } from '@/types/errorLog';

/** The dev sink writes to console; silence it so test output stays readable. */
beforeEach(() => {
  setMonitoringSink(() => undefined);
  clearLogs();
});

afterEach(() => {
  setMonitoringSink();
  clearLogs();
});

describe('errorLogger', () => {
  it('derives channel, severity, fingerprint, session and release from a minimal input', () => {
    const entry = logError({ error: 'BOOM', errorDescription: 'It broke' });

    expect(entry.channel).toBe('app');
    expect(entry.level).toBe('error');
    expect(entry.severity).toBe('error');
    expect(entry.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(entry.sessionId).toBeTruthy();
    expect(entry.release).toBeTruthy();
    expect(getLogs()).toHaveLength(1);
  });

  it('separates channels so one tab never shows another tab entries', () => {
    logError({ channel: 'api', error: 'API_500', errorDescription: 'Server error' });
    logError({ channel: 'app', error: 'BOUNDARY_UNKNOWN', errorDescription: 'Render crash' });

    expect(getLogsByChannel('api')).toHaveLength(1);
    expect(getLogsByChannel('app')).toHaveLength(1);
    expect(getLogsByChannel('test')).toHaveLength(0);
  });

  it('clears one channel without touching the others', () => {
    logError({ channel: 'api', error: 'API_500', errorDescription: 'Server error' });
    logError({ channel: 'app', error: 'CRASH', errorDescription: 'Render crash' });

    clearLogs('api');

    expect(getLogsByChannel('api')).toHaveLength(0);
    expect(getLogsByChannel('app')).toHaveLength(1);
  });

  it('classifies severity from HTTP status', () => {
    const server = logError({
      channel: 'api',
      error: 'API_500',
      errorDescription: 'x',
      status: 500,
    });
    const client = logError({
      channel: 'api',
      error: 'API_404',
      errorDescription: 'x',
      status: 404,
    });

    expect(server.severity).toBe('fatal');
    expect(client.severity).toBe('warning');
  });

  it('gives repeated occurrences of one fault the same fingerprint', () => {
    logError({ channel: 'api', error: 'API_500', errorDescription: 'a', apiEndpoint: '/products' });
    logError({ channel: 'api', error: 'API_500', errorDescription: 'b', apiEndpoint: '/products' });
    logError({ channel: 'api', error: 'API_500', errorDescription: 'c', apiEndpoint: '/users' });

    const grouped = groupByFingerprint(getLogs());

    expect(grouped).toHaveLength(2);
    expect(grouped.map((group) => group.count).sort()).toEqual([1, 2]);
  });

  it('filters by level and free-text search', () => {
    logError({ error: 'ALPHA', errorDescription: 'first problem' });
    logWarning({ error: 'BETA', errorDescription: 'second problem' });
    logInfo({ error: 'GAMMA', errorDescription: 'third problem' });

    const entries = getLogs();

    expect(filterLogs(entries, { level: 'warning' })).toHaveLength(1);
    expect(filterLogs(entries, { level: 'all' })).toHaveLength(3);
    expect(filterLogs(entries, { search: 'gamma' })).toHaveLength(1);
    expect(filterLogs(entries, { search: 'problem' })).toHaveLength(3);
    expect(countByLevel(entries)).toEqual({ error: 1, warning: 1, info: 1 });
  });

  it('notifies subscribers on write and clear', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    logError({ error: 'X', errorDescription: 'y' });
    expect(listener).toHaveBeenCalledTimes(1);

    clearLogs();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    logError({ error: 'X', errorDescription: 'y' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('hands every entry to the monitoring sink', () => {
    const sink = vi.fn();
    setMonitoringSink(sink);

    logError({ channel: 'api', error: 'API_500', errorDescription: 'boom' });

    expect(sink).toHaveBeenCalledTimes(1);
    expect((sink.mock.calls[0][0] as ErrorLogEntry).error).toBe('API_500');
  });

  it('survives a broken sink and a broken listener', () => {
    setMonitoringSink(() => {
      throw new Error('sink is down');
    });
    subscribe(() => {
      throw new Error('listener is down');
    });

    expect(() => logError({ error: 'X', errorDescription: 'y' })).not.toThrow();
    expect(getLogs()).toHaveLength(1);
  });

  it('ignores a corrupt storage payload instead of throwing', () => {
    window.localStorage.setItem('app.customErrorLog.v2', 'not json at all');

    expect(getLogs()).toEqual([]);
    expect(() => logError({ error: 'X', errorDescription: 'y' })).not.toThrow();
  });

  it('exports both formats with the channel and correlation detail', () => {
    logError({
      channel: 'api',
      error: 'API_500',
      errorDescription: 'Server error',
      apiEndpoint: '/products/1',
      httpMethod: 'GET',
      status: 500,
      durationMs: 42,
      correlationId: 'r-abc',
    });
    const entries = getLogs();

    const text = buildLogFile(entries, 'log');
    expect(text).toContain('api/fatal');
    expect(text).toContain('/products/1');
    expect(text).toContain('r-abc');

    const json: unknown = JSON.parse(buildLogFile(entries, 'json'));
    expect(Array.isArray(json)).toBe(true);
  });
});
