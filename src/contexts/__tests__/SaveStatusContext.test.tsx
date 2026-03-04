import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { useContext } from 'react';
import { SaveStatusContext, SaveStatusProvider } from '../SaveStatusContext';

function StatusDisplay() {
  const ctx = useContext(SaveStatusContext)!;
  return (
    <div>
      <p data-testid="status">{ctx.status}</p>
      <p data-testid="error">{ctx.errorMessage ?? 'none'}</p>
      <button onClick={() => ctx.setSaveStatus('saving')}>saving</button>
      <button onClick={() => ctx.setSaveStatus('saved')}>saved</button>
      <button onClick={() => ctx.setSaveStatus('error', 'Something broke')}>error</button>
      <button onClick={() => ctx.clearError()}>clear</button>
    </div>
  );
}

describe('SaveStatusContext', () => {
  function renderWithProvider() {
    return render(
      <SaveStatusProvider>
        <StatusDisplay />
      </SaveStatusProvider>
    );
  }

  it('starts with idle status and no error', () => {
    renderWithProvider();
    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('sets status to saving', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('saving'));
    expect(screen.getByTestId('status').textContent).toBe('saving');
  });

  it('sets status to saved', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('saved'));
    expect(screen.getByTestId('status').textContent).toBe('saved');
  });

  it('sets error status with message', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('error'));
    expect(screen.getByTestId('status').textContent).toBe('error');
    expect(screen.getByTestId('error').textContent).toBe('Something broke');
  });

  it('clearError resets to idle with no message', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('error'));
    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('clears errorMessage when transitioning from error to saving', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('error'));
    fireEvent.click(screen.getByText('saving'));
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('auto-reverts saved to idle after 3 seconds', () => {
    vi.useFakeTimers();
    renderWithProvider();
    fireEvent.click(screen.getByText('saved'));
    expect(screen.getByTestId('status').textContent).toBe('saved');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId('status').textContent).toBe('idle');
    vi.useRealTimers();
  });

  it('does not revert if status changes before 3s timeout fires', () => {
    vi.useFakeTimers();
    renderWithProvider();
    fireEvent.click(screen.getByText('saved'));
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByText('saving'));
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.getByTestId('status').textContent).toBe('saving');
    vi.useRealTimers();
  });
});
