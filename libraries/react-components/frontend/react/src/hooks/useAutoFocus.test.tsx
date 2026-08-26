import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAutoFocus } from './useAutoFocus';

/**
 * These assertions stand in for inline editing working at all.
 *
 * The grid cell editors used to carry the `autoFocus` JSX attribute. They now
 * focus themselves through this hook instead, and if that ever regresses the
 * symptom is subtle and infuriating: double-clicking a cell opens the editor,
 * but the first thing you type goes nowhere.
 */
function TextEditorHarness({ enabled = true }: { enabled?: boolean }) {
  const focusRef = useAutoFocus<HTMLInputElement>(enabled);
  return <TextField inputRef={focusRef} label="Cell" />;
}

function SelectEditorHarness() {
  // MUI hands `inputRef` an imperative handle rather than a DOM node.
  const focusRef = useAutoFocus<{ focus: () => void }>();
  return <Select inputRef={focusRef} native value="" inputProps={{ 'aria-label': 'Cell' }} />;
}

describe('useAutoFocus', () => {
  it('focuses a text input as soon as the editor mounts', () => {
    render(<TextEditorHarness />);

    expect(screen.getByLabelText('Cell')).toHaveFocus();
  });

  it('leaves focus alone when disabled', () => {
    render(<TextEditorHarness enabled={false} />);

    expect(screen.getByLabelText('Cell')).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("focuses a Select through MUI's imperative inputRef handle", () => {
    render(<SelectEditorHarness />);

    expect(screen.getByLabelText('Cell')).toHaveFocus();
  });
});
