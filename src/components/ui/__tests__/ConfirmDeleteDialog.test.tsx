import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';

describe('ConfirmDeleteDialog', () => {
  it('renders with default props when open', () => {
    render(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders with custom title and description', () => {
    render(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete this item?"
        description="All data will be permanently removed."
      />
    );

    expect(screen.getByText('Delete this item?')).toBeInTheDocument();
    expect(screen.getByText('All data will be permanently removed.')).toBeInTheDocument();
  });

  it('renders with custom confirmText', () => {
    render(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        confirmText="Remove"
      />
    );

    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading state — button disabled and text changes', () => {
    render(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        loading={true}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /deleting/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('does not render content when closed', () => {
    render(
      <ConfirmDeleteDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('renders children inside the dialog body', () => {
    render(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      >
        <p>Custom body content</p>
      </ConfirmDeleteDialog>
    );

    expect(screen.getByText('Custom body content')).toBeInTheDocument();
  });

  describe('requireTypedConfirm', () => {
    it('renders a text input when requireTypedConfirm is true', () => {
      render(
        <ConfirmDeleteDialog
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
          requireTypedConfirm={true}
        />
      );

      expect(screen.getByPlaceholderText('Type DELETE here')).toBeInTheDocument();
    });

    it('confirm button is disabled until "DELETE" is typed', () => {
      render(
        <ConfirmDeleteDialog
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
          requireTypedConfirm={true}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
      expect(confirmBtn).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('Type DELETE here'), {
        target: { value: 'DELETE' },
      });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('does not fire onConfirm when confirm button is disabled', () => {
      const onConfirm = vi.fn();
      render(
        <ConfirmDeleteDialog
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={onConfirm}
          requireTypedConfirm={true}
        />
      );

      // button is disabled — click should not fire
      const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
