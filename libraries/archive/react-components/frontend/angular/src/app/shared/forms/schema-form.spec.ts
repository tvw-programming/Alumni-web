import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SchemaForm } from './schema-form';
import { setMonitoringSink } from '../../core/errors/monitoring';

import type { FormSchema, FormValues } from './form.types';

@Component({
  imports: [SchemaForm],
  template: `
    <app-schema-form
      [schema]="schema()"
      [defaultValues]="defaults()"
      (formSubmit)="submitted.set($event)"
      (invalidSubmit)="invalidFields.set($event)"
    />
  `,
})
class Host {
  readonly schema = signal<FormSchema>({
    submitLabel: 'Save',
    fields: [
      { name: 'title', label: 'Title', type: 'text', validation: { required: true, minLength: 3 } },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      { name: 'active', label: 'Active', type: 'checkbox' },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: [{ value: 'a', label: 'Alpha' }],
      },
    ],
  });
  readonly defaults = signal<FormValues>({});
  readonly submitted = signal<FormValues | null>(null);
  readonly invalidFields = signal<string[]>([]);
}

describe('SchemaForm', () => {
  beforeEach(() => {
    // The dev monitoring sink writes to console; silence it for readable output.
    setMonitoringSink(() => undefined);
  });

  async function render() {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture;
  }

  it('renders a control for every field in the schema', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('app-text-field').length).toBe(1);
    expect(el.querySelectorAll('app-textarea-field').length).toBe(1);
    expect(el.querySelectorAll('app-checkbox-field').length).toBe(1);
    expect(el.querySelectorAll('app-select-field').length).toBe(1);
  });

  it('uses the schema submit label', async () => {
    const fixture = await render();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Save');
  });

  it('blocks submission and reports the invalid fields', async () => {
    const fixture = await render();
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    // `title` is required and empty; nothing should reach the submit handler.
    expect(fixture.componentInstance.submitted()).toBeNull();
    expect(fixture.componentInstance.invalidFields()).toContain('title');
  });

  it('carries typed values through to the submit handler', async () => {
    const fixture = await render();
    fixture.componentInstance.defaults.set({ title: 'Valid title', active: true });
    await fixture.whenStable();

    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(fixture.componentInstance.submitted()).toMatchObject({
      title: 'Valid title',
      active: true,
    });
  });

  it('derives defaults per type so no control starts undefined', async () => {
    const fixture = await render();
    // 'ok' would be 2 chars and fail the minLength(3) rule, blocking submit.
    fixture.componentInstance.defaults.set({ title: 'okay' });
    await fixture.whenStable();

    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const values = fixture.componentInstance.submitted();
    // checkbox → false, textarea/select → '' — never `undefined`, which would
    // break reset() and make a control look untouched-but-dirty.
    expect(values).toMatchObject({ notes: '', active: false, category: '' });
  });

  it('falls back to a text input for an unknown field type', async () => {
    const fixture = await render();
    fixture.componentInstance.schema.set({
      fields: [{ name: 'mystery', label: 'Mystery', type: 'not-registered' }],
    });
    await fixture.whenStable();

    // A schema typo should be visible and editable, not an invisible gap.
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-text-field').length).toBe(1);
  });
});
