import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';
import { SaveStatusProvider } from '@/contexts/SaveStatusContext';
import { useSaveStatus } from '../useSaveStatus';

function TestConsumer() {
  const { status, errorMessage, setSaveStatus, clearError } = useSaveStatus();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{errorMessage ?? 'none'}</span>
      <button onClick={() => setSaveStatus('saving')}>set saving</button>
      <button onClick={() => setSaveStatus('saved')}>set saved</button>
      <button onClick={() => setSaveStatus('error', 'Oops!')}>set error</button>
      <button onClick={() => clearError()}>clear error</button>
    </div>
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return <SaveStatusProvider>{children}</SaveStatusProvider>;
}

describe('useSaveStatus', () => {
  it('starts with idle status', () => {
    render(<TestConsumer />, { wrapper });
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('transitions to saving', async () => {
    const user = userEvent.setup();
    render(<TestConsumer />, { wrapper });
    await user.click(screen.getByText('set saving'));
    expect(screen.getByTestId('status').textContent).toBe('saving');
  });

  it('transitions to saved', async () => {
    const user = userEvent.setup();
    render(<TestConsumer />, { wrapper });
    await user.click(screen.getByText('set saved'));
    expect(screen.getByTestId('status').textContent).toBe('saved');
  });

  it('sets error message when status is error', async () => {
    const user = userEvent.setup();
    render(<TestConsumer />, { wrapper });
    await user.click(screen.getByText('set error'));
    expect(screen.getByTestId('status').textContent).toBe('error');
    expect(screen.getByTestId('error').textContent).toBe('Oops!');
  });

  it('clearError resets to idle and removes error message', async () => {
    const user = userEvent.setup();
    render(<TestConsumer />, { wrapper });
    await user.click(screen.getByText('set error'));
    await user.click(screen.getByText('clear error'));
    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('clears error message when transitioning away from error state', async () => {
    const user = userEvent.setup();
    render(<TestConsumer />, { wrapper });
    await user.click(screen.getByText('set error'));
    await user.click(screen.getByText('set saving'));
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('auto-clears saved status after 3s', async () => {
    vi.useFakeTimers();
    render(<TestConsumer />, { wrapper });

    act(() => {
      screen.getByText('set saved').click();
    });
    expect(screen.getByTestId('status').textContent).toBe('saved');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('status').textContent).toBe('idle');

    vi.useRealTimers();
  });

  it('returns no-op values when used outside provider', () => {
    // useSaveStatus is designed to not throw outside provider
    const { result } = (() => {
      let capturedResult: ReturnType<typeof useSaveStatus> | null = null;
      function Grabber() {
        capturedResult = useSaveStatus();
        return null;
      }
      // render WITHOUT SaveStatusProvider wrapper
      render(<Grabber />);
      return { result: capturedResult! };
    })();

    expect(result.status).toBe('idle');
    expect(() => result.setSaveStatus('saving')).not.toThrow();
    expect(() => result.clearError()).not.toThrow();
  });
});
