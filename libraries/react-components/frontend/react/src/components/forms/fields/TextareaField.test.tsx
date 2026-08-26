import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TextareaField from './TextareaField';

import type { FieldRendererProps } from './types';
import type { FieldConfigV2 } from '@/types/formSystem';

/** Renders the field and returns the textarea, found through the a11y tree. */
function renderField(overrides: Partial<FieldRendererProps> = {}): HTMLElement {
  const props: FieldRendererProps = {
    field: { name: 'notes', label: 'Notes', type: 'textarea' },
    value: '',
    disabled: false,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    name: 'notes',
    inputRef: null,
    attrs: {},
    ...overrides,
  };

  render(<TextareaField {...props} />);
  return screen.getByLabelText('Notes');
}

describe('TextareaField row count', () => {
  /**
   * Regression: the row count used to be `field.rows ?? Number(attrs.rows) ?? 4`.
   * `Number(undefined)` is NaN — which is not nullish — so the `?? 4` fallback
   * never fired and MUI received `rows={NaN}`, collapsing the textarea.
   */
  it('falls back to the default when no row count is supplied anywhere', () => {
    expect(renderField()).toHaveAttribute('rows', '4');
  });

  it('falls back to the default when attrs.rows is not a number', () => {
    expect(renderField({ attrs: { rows: 'tall' } })).toHaveAttribute('rows', '4');
  });

  it('falls back to the default rather than rendering a zero-row textarea', () => {
    expect(renderField({ attrs: { rows: 0 } })).toHaveAttribute('rows', '4');
  });

  it('honours a numeric string from attrs', () => {
    expect(renderField({ attrs: { rows: '8' } })).toHaveAttribute('rows', '8');
  });

  it('lets the field config win over attrs', () => {
    const field = { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 } as FieldConfigV2;

    expect(renderField({ field, attrs: { rows: 9 } })).toHaveAttribute('rows', '2');
  });
});

describe('TextareaField wiring', () => {
  it('shows the error text and marks the control invalid', () => {
    renderField({ error: 'Notes are required' });

    expect(screen.getByText('Notes are required')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInvalid();
  });

  it('renders a null value as an empty string rather than the text "null"', () => {
    expect(renderField({ value: null })).toHaveValue('');
  });
});
