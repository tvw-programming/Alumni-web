import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { snackbar } from './snackbarBus';
import { SnackbarProvider } from './SnackbarProvider';

/**
 * The queue is the whole point of this component: two snackbars raised in the
 * same tick must be shown one after the other, not stacked or dropped. The
 * head of the queue stays mounted through its exit transition, so the
 * assertions below wait for it to disappear rather than assuming it is
 * immediate.
 */
function renderProvider() {
  render(
    <SnackbarProvider>
      <div>app</div>
    </SnackbarProvider>,
  );
}

describe('SnackbarProvider', () => {
  it('renders its children when nothing has been raised', () => {
    renderProvider();

    expect(screen.getByText('app')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a snackbar raised from the module-level bus', async () => {
    renderProvider();

    act(() => {
      snackbar.success('Saved');
    });

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('shows queued snackbars one at a time, in order', async () => {
    const user = userEvent.setup();
    renderProvider();

    act(() => {
      snackbar.info('First', { autoHideDuration: null });
      snackbar.info('Second', { autoHideDuration: null });
    });

    // Only the head is visible.
    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Close'));

    // Dismissing the head promotes the next one.
    expect(await screen.findByText('Second')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('First')).not.toBeInTheDocument();
    });
  });

  it('empties the queue once every snackbar has been dismissed', async () => {
    const user = userEvent.setup();
    renderProvider();

    act(() => {
      snackbar.warning('Only one', { autoHideDuration: null });
    });
    await screen.findByText('Only one');

    await user.click(screen.getByLabelText('Close'));

    await waitFor(() => {
      expect(screen.queryByText('Only one')).not.toBeInTheDocument();
    });
    expect(screen.getByText('app')).toBeInTheDocument();
  });

  it('runs the action callback and dismisses the snackbar', async () => {
    const user = userEvent.setup();
    let clicked = false;
    renderProvider();

    act(() => {
      snackbar.info('Undo me', {
        autoHideDuration: null,
        action: {
          label: 'Undo',
          onClick: () => {
            clicked = true;
          },
        },
      });
    });

    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    expect(clicked).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('Undo me')).not.toBeInTheDocument();
    });
  });
});
