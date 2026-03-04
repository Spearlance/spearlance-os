import { describe, it, expect } from 'vitest';
import { reducer } from '../use-toast';

const TOAST_LIMIT = 1;

function makeToast(id: string, title?: string) {
  return { id, title: title ?? `Toast ${id}`, open: true };
}

describe('toast reducer', () => {
  describe('ADD_TOAST', () => {
    it('adds a toast to empty state', () => {
      const result = reducer({ toasts: [] }, {
        type: 'ADD_TOAST',
        toast: makeToast('1'),
      });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('1');
    });

    it('prepends new toast (newest first)', () => {
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('2'),
      });
      expect(result.toasts[0].id).toBe('2');
    });

    it('limits to TOAST_LIMIT (1 toast max)', () => {
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('2'),
      });
      expect(result.toasts).toHaveLength(TOAST_LIMIT);
      expect(result.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates an existing toast by id', () => {
      const state = { toasts: [makeToast('1', 'Old Title')] };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'New Title' },
      });
      expect(result.toasts[0].title).toBe('New Title');
    });

    it('does not affect other toasts', () => {
      const state = { toasts: [makeToast('1', 'Keep Me')] };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: 'nonexistent', title: 'New' },
      });
      expect(result.toasts[0].title).toBe('Keep Me');
    });

    it('preserves existing properties not in update', () => {
      const state = { toasts: [makeToast('1', 'Title')] };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', open: false },
      });
      expect(result.toasts[0].title).toBe('Title');
      expect(result.toasts[0].open).toBe(false);
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open to false for a specific toast', () => {
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });
      expect(result.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when no toastId provided', () => {
      // Since TOAST_LIMIT is 1, we test with single toast
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: undefined,
      });
      expect(result.toasts.every(t => t.open === false)).toBe(true);
    });

    it('does not remove the toast from the array', () => {
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });
      expect(result.toasts).toHaveLength(1);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes a specific toast by id', () => {
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });
      expect(result.toasts).toHaveLength(0);
    });

    it('removes all toasts when toastId is undefined', () => {
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: undefined,
      });
      expect(result.toasts).toHaveLength(0);
    });

    it('does not remove non-matching toasts', () => {
      const state = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: 'nonexistent',
      });
      expect(result.toasts).toHaveLength(1);
    });
  });
});
