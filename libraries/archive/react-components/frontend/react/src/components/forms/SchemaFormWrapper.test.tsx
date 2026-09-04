import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildDefaultValues } from './fields';
import { SchemaFormWrapper } from './SchemaFormWrapper';

import type { FieldConfigV2, FormSchemaV2, FormValues } from '@/types/formSystem';

/**
 * End-to-end cover for the schema → registry → renderer → form-state chain.
 *
 * The whole chain was retyped from `any` to `unknown`, with each renderer
 * narrowing through `valueCoercion`. Unit tests cover the narrowing; this
 * proves the pieces still fit: a JSON-shaped schema renders real controls,
 * typing reaches form state, validation blocks submission, and the submitted
 * payload carries the values the user entered.
 */
const FIELDS: FieldConfigV2[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'quantity', label: 'Quantity', type: 'number' },
  { name: 'agreed', label: 'Agreed', type: 'checkbox' },
];

function renderForm(onSubmit: (data: FormValues) => void | Promise<void>) {
  const schema: FormSchemaV2 = { fields: FIELDS, onSubmit };
  render(
    <SchemaFormWrapper
      schema={schema}
      defaultValues={buildDefaultValues(FIELDS)}
      submitButtonLabel="Save"
    />,
  );
}

describe('SchemaFormWrapper', () => {
  it('renders a control for every field in the schema', () => {
    renderForm(vi.fn());

    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Agreed/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('starts every field controlled, so React never warns about the switch', () => {
    renderForm(vi.fn());

    expect(screen.getByLabelText(/Title/)).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /Agreed/ })).not.toBeChecked();
  });

  it('carries typed values through to the submit handler', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await user.type(screen.getByLabelText(/Title/), 'Widget');
    await user.type(screen.getByLabelText(/Quantity/), '7');
    await user.click(screen.getByRole('checkbox', { name: /Agreed/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = onSubmit.mock.calls[0]?.[0] as FormValues;
    expect(submitted.title).toBe('Widget');
    // `type: number` must store a real number, not the string "7".
    expect(submitted.quantity).toBe(7);
    expect(submitted.agreed).toBe(true);
  });

  it('blocks submission and shows the message when a required field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
