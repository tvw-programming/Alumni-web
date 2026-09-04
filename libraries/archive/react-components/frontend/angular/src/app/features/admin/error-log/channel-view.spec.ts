import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ErrorLogStore } from '../../../core/errors/error-log-store';
import { channelView } from './channel-view';
import { clearLogs, logError } from '../../../core/errors/error-logger';

import type { ChannelView } from './channel-view';

/** `channelView` injects, so it has to be created inside an injection context. */
function makeView(channel: 'api' | 'app' | 'test'): ChannelView {
  return TestBed.runInInjectionContext(() => channelView(channel));
}

describe('channelView', () => {
  beforeEach(() => {
    clearLogs();
    TestBed.configureTestingModule({ providers: [ErrorLogStore] });
  });

  it('shows only its own channel', () => {
    logError({ channel: 'api', error: 'API_500', errorDescription: 'server error' });
    logError({ channel: 'app', error: 'BOUNDARY', errorDescription: 'render crash' });

    expect(makeView('api').entries().map((e) => e.error)).toEqual(['API_500']);
    expect(makeView('app').entries().map((e) => e.error)).toEqual(['BOUNDARY']);
  });

  it('picks up entries logged after it was created', () => {
    // The console is open while the app is being used; entries must arrive
    // without the operator reloading the page.
    const view = makeView('api');
    expect(view.entries()).toHaveLength(0);

    logError({ channel: 'api', error: 'API_404', errorDescription: 'not found' });

    expect(view.entries()).toHaveLength(1);
  });

  it('filters by search text', () => {
    logError({ channel: 'api', error: 'API_404', errorDescription: 'products missing' });
    logError({ channel: 'api', error: 'API_500', errorDescription: 'users exploded' });

    const view = makeView('api');
    view.search.set('products');

    expect(view.filtered().map((e) => e.error)).toEqual(['API_404']);
  });

  it('filters by level', () => {
    logError({ channel: 'api', level: 'error', error: 'API_500', errorDescription: 'boom' });
    logError({ channel: 'api', level: 'warning', error: 'API_SLOW', errorDescription: 'slow' });

    const view = makeView('api');
    view.level.set('warning');

    expect(view.filtered().map((e) => e.error)).toEqual(['API_SLOW']);
  });

  it('collapses duplicates when grouping, and counts them', () => {
    for (let i = 0; i < 3; i += 1) {
      logError({ channel: 'api', error: 'API_404', errorDescription: 'not found' });
    }
    logError({ channel: 'api', error: 'API_500', errorDescription: 'server error' });

    const view = makeView('api');
    expect(view.rows()).toHaveLength(4);

    view.grouped.set(true);
    expect(view.rows()).toHaveLength(2);

    const counts = view.countByFingerprint();
    expect(counts).not.toBeNull();
    const repeated = view.rows().find((entry) => entry.error === 'API_404');
    expect(counts?.get(repeated!.fingerprint)).toBe(3);
  });

  it('exposes no fingerprint counts while ungrouped', () => {
    logError({ channel: 'api', error: 'API_404', errorDescription: 'not found' });
    expect(makeView('api').countByFingerprint()).toBeNull();
  });

  it('clears its own channel without touching the others', () => {
    logError({ channel: 'api', error: 'API_500', errorDescription: 'server error' });
    logError({ channel: 'app', error: 'BOUNDARY', errorDescription: 'render crash' });

    const api = makeView('api');
    const app = makeView('app');
    api.clearChannel();

    expect(api.entries()).toHaveLength(0);
    // Clearing one tab must not destroy another tab's evidence.
    expect(app.entries()).toHaveLength(1);
  });

  it('counts by level over the whole channel, not the filtered view', () => {
    logError({ channel: 'api', level: 'error', error: 'API_500', errorDescription: 'boom' });
    logError({ channel: 'api', level: 'warning', error: 'API_SLOW', errorDescription: 'slow' });

    const view = makeView('api');
    view.search.set('boom');

    expect(view.filtered()).toHaveLength(1);
    // The chips describe the channel, so they must not shrink as you search.
    expect(view.counts()).toMatchObject({ error: 1, warning: 1 });
  });
});
