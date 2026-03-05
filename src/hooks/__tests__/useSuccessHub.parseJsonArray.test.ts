/**
 * Tests for the parseJsonArray helper used in useSuccessHub.
 * This is a critical data transformation for converting Supabase JSON
 * columns into typed arrays.
 */
import { describe, it, expect } from 'vitest';
import type { Json } from '@/integrations/supabase/types';

// Replicate the helper (it's not exported, so we test the same logic)
function parseJsonArray<T>(data: Json | null | undefined, defaultValue: T[]): T[] {
  if (!data) return defaultValue;
  if (Array.isArray(data)) return data as unknown as T[];
  return defaultValue;
}

interface Item {
  id: string;
  title: string;
}

describe('parseJsonArray', () => {
  it('returns the array when data is already an array', () => {
    const data = [{ id: '1', title: 'Win' }];
    const result = parseJsonArray<Item>(data as unknown as Json, []);
    expect(result).toEqual([{ id: '1', title: 'Win' }]);
  });

  it('returns defaultValue when data is null', () => {
    const result = parseJsonArray<Item>(null, []);
    expect(result).toEqual([]);
  });

  it('returns defaultValue when data is undefined', () => {
    const result = parseJsonArray<Item>(undefined, []);
    expect(result).toEqual([]);
  });

  it('returns defaultValue when data is a plain object (not array)', () => {
    const data = { id: '1' } as unknown as Json;
    const result = parseJsonArray<Item>(data, []);
    expect(result).toEqual([]);
  });

  it('returns defaultValue when data is a string', () => {
    const result = parseJsonArray<Item>('not an array' as unknown as Json, []);
    expect(result).toEqual([]);
  });

  it('returns defaultValue when data is a number', () => {
    const result = parseJsonArray<Item>(42 as unknown as Json, []);
    expect(result).toEqual([]);
  });

  it('returns defaultValue when data is false', () => {
    const result = parseJsonArray<Item>(false as unknown as Json, []);
    expect(result).toEqual([]);
  });

  it('returns empty array when data is empty array', () => {
    const result = parseJsonArray<Item>([] as unknown as Json, [{ id: 'default', title: 'Default' }]);
    expect(result).toEqual([]);
  });

  it('returns provided defaultValue correctly', () => {
    const defaultVal: Item[] = [{ id: 'fallback', title: 'Fallback' }];
    const result = parseJsonArray<Item>(null, defaultVal);
    expect(result).toBe(defaultVal);
  });
});
