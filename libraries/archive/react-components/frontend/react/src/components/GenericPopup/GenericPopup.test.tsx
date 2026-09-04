import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GenericPopup } from './GenericPopup';

describe('GenericPopup', () => {
  it('renders parent-owned header, body, and footer content in a portal', () => {
    const { container } = render(
      <GenericPopup
        open
        onClose={vi.fn()}
        slots={{
          header: <h2>Custom header</h2>,
          body: <div>Custom body</div>,
          footer: <button type="button">Custom footer action</button>,
        }}
        ariaLabel="Custom popup"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Custom header' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Custom header')).toBeInTheDocument();
    expect(screen.getByText('Custom body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom footer action' })).toBeInTheDocument();
    expect(within(container).queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('delegates confirm and cancel actions to the parent', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <GenericPopup
        open
        onClose={onClose}
        header={{ title: 'Confirm changes' }}
        actions={{ onConfirm, confirmLabel: 'Apply', cancelLabel: 'Go back' }}
      >
        Changes
      </GenericPopup>,
    );

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await user.click(screen.getByRole('button', { name: 'Go back' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith('cancel');
  });

  it('connects a confirm action to a parent-owned form', () => {
    render(
      <GenericPopup
        open
        onClose={vi.fn()}
        header={{ title: 'Edit item' }}
        actions={{ formId: 'item-form', confirmLabel: 'Save' }}
      >
        <form id="item-form">Form fields</form>
      </GenericPopup>,
    );

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toHaveAttribute('type', 'submit');
    expect(save).toHaveAttribute('form', 'item-form');
  });

  it('enforces Escape and dirty-close policies', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onBlockedClose = vi.fn();
    const { rerender } = render(
      <GenericPopup
        open
        onClose={onClose}
        onBlockedClose={onBlockedClose}
        header={{ title: 'Protected popup' }}
        closeBehavior={{ closeOnEscape: false }}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onBlockedClose).toHaveBeenCalledWith('escape');
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <GenericPopup
        open
        onClose={onClose}
        onBlockedClose={onBlockedClose}
        header={{ title: 'Protected popup' }}
        closeBehavior={{ dirty: true, preventCloseWhenDirty: true }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Close popup' }));

    expect(onBlockedClose).toHaveBeenCalledWith('close-button');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('blocks closing and disables actions while loading', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onBlockedClose = vi.fn();
    render(
      <GenericPopup
        open
        onClose={onClose}
        onBlockedClose={onBlockedClose}
        header={{ title: 'Saving item' }}
        actions={{ onConfirm: vi.fn(), loading: true, loadingLabel: 'Saving…' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Close popup' }));

    expect(onBlockedClose).toHaveBeenCalledWith('close-button');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders destructive and full-screen variants', () => {
    render(
      <GenericPopup
        open
        onClose={vi.fn()}
        size="full-screen"
        mode="destructive"
        header={{ title: 'Delete item' }}
        actions={{ onConfirm: vi.fn(), confirmLabel: 'Delete' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('MuiButton-colorError');
    expect(screen.getByRole('dialog', { name: 'Delete item' })).toHaveClass(
      'MuiDialog-paperFullScreen',
    );
  });

  it('supports drawer presentation with dialog semantics', () => {
    render(
      <GenericPopup open onClose={vi.fn()} variant="drawer" header={{ title: 'Filters' }}>
        Drawer content
      </GenericPopup>,
    );

    expect(screen.getByRole('dialog', { name: 'Filters' })).toHaveTextContent('Drawer content');
  });
});
