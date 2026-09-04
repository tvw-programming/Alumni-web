import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { GenericCard } from './generic-card';

@Component({
  imports: [GenericCard],
  template: `
    <app-generic-card
      title="Revenue"
      subtitle="This month"
      [loading]="loading"
      [error]="error"
      [empty]="empty"
      emptyMessage="Nothing yet"
    >
      <p>body content</p>
    </app-generic-card>
  `,
})
class Host {
  loading = false;
  error: string | null = null;
  empty = false;
}

describe('GenericCard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders header and projected content', async () => {
    await fixture.whenStable();
    expect(text()).toContain('Revenue');
    expect(text()).toContain('This month');
    expect(text()).toContain('body content');
  });

  it('prioritises loading over error and empty', async () => {
    // All three set at once: a refetch after a failure should show progress,
    // not a stale error.
    fixture.componentInstance.loading = true;
    fixture.componentInstance.error = 'Network unavailable';
    fixture.componentInstance.empty = true;
    await fixture.whenStable();

    expect(text()).not.toContain('Network unavailable');
    expect(text()).not.toContain('Nothing yet');
    expect(text()).not.toContain('body content');
  });

  it('prioritises error over empty', async () => {
    fixture.componentInstance.error = 'Network unavailable';
    fixture.componentInstance.empty = true;
    await fixture.whenStable();

    expect(text()).toContain('Network unavailable');
    expect(text()).not.toContain('Nothing yet');
  });

  it('shows the empty message instead of content when empty', async () => {
    fixture.componentInstance.empty = true;
    await fixture.whenStable();

    expect(text()).toContain('Nothing yet');
    expect(text()).not.toContain('body content');
  });

  it('announces the loading state to assistive tech', async () => {
    fixture.componentInstance.loading = true;
    await fixture.whenStable();

    const busy = (fixture.nativeElement as HTMLElement).querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
  });
});
