import Button from '@mui/material/Button';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GenericCard } from './GenericCard';

describe('GenericCard', () => {
  it('renders structured header content and composed body/footer slots', () => {
    render(
      <GenericCard
        header={{
          title: 'Revenue',
          subtitle: 'This month',
          description: 'Across all products',
          metric: '₹42,000',
          badge: <span>On target</span>,
        }}
        slots={{ body: <div>Chart content</div>, footer: <Button>Open report</Button> }}
      />,
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('Across all products')).toBeInTheDocument();
    expect(screen.getByText('₹42,000')).toBeInTheDocument();
    expect(screen.getByText('On target')).toBeInTheDocument();
    expect(screen.getByText('Chart content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open report' })).toBeInTheDocument();
  });

  it('prioritizes loading, error, and empty states over normal content', () => {
    const { rerender } = render(
      <GenericCard state={{ loading: true }}>Normal content</GenericCard>,
    );

    expect(screen.getByLabelText('Loading card content')).toBeInTheDocument();
    expect(screen.queryByText('Normal content')).not.toBeInTheDocument();

    rerender(<GenericCard state={{ error: 'Network unavailable' }}>Normal content</GenericCard>);
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');

    rerender(
      <GenericCard state={{ empty: true, emptyTitle: 'No records' }}>Normal content</GenericCard>,
    );
    expect(screen.getByText('No records')).toBeInTheDocument();
  });

  it('delegates retry actions to the parent', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<GenericCard state={{ error: 'Failed', onRetry }} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('supports keyboard activation without treating nested controls as card clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <GenericCard
        aria-label="Select summary"
        header={{ action: <Button>Menu</Button> }}
        onClick={onClick}
      >
        Summary
      </GenericCard>,
    );

    const card = screen.getByRole('button', { name: 'Select summary' });
    card.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('minimizes to the header and restores its body', async () => {
    const user = userEvent.setup();
    render(
      <GenericCard header={{ title: 'Window card' }} windowControls={{ minimizable: true }}>
        Window body
      </GenericCard>,
    );

    await user.click(screen.getByRole('button', { name: 'Minimize card' }));
    expect(screen.queryByText('Window body')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore card' }));
    expect(screen.getByText('Window body')).toBeInTheDocument();
  });

  it('blocks pointer and keyboard activation when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <GenericCard aria-label="Disabled summary" disabled onClick={onClick}>
        Disabled content
      </GenericCard>,
    );

    const card = screen.getByRole('button', { name: 'Disabled summary' });
    expect(card).toHaveAttribute('aria-disabled', 'true');
    card.focus();
    await user.keyboard('{Enter}');
    await user.click(card);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders every surface on a bare MUI theme without the app glass tokens', () => {
    for (const surface of ['default', 'subtle', 'accent', 'glass'] as const) {
      const { unmount } = render(
        <GenericCard appearance={{ surface }}>{`${surface} body`}</GenericCard>,
      );
      expect(screen.getByText(`${surface} body`)).toBeInTheDocument();
      unmount();
    }
  });
});
