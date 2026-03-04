import { describe, it, expect } from 'vitest';
import { cn, parseUTCDate } from '../utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('merges tailwind conflicting classes — last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('returns empty string when no classes given', () => {
    expect(cn()).toBe('');
  });
});

describe('parseUTCDate', () => {
  it('parses a date-only string into local date', () => {
    const date = parseUTCDate('2024-03-15');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(2); // 0-indexed, March = 2
    expect(date.getDate()).toBe(15);
  });

  it('strips time component from a full ISO string', () => {
    const date = parseUTCDate('2024-06-01T23:59:59Z');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(5); // June = 5
    expect(date.getDate()).toBe(1);
  });

  it('parses beginning of year correctly', () => {
    const date = parseUTCDate('2023-01-01');
    expect(date.getFullYear()).toBe(2023);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });

  it('parses end of year correctly', () => {
    const date = parseUTCDate('2023-12-31');
    expect(date.getFullYear()).toBe(2023);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(31);
  });

  it('returns a Date instance', () => {
    expect(parseUTCDate('2024-01-01')).toBeInstanceOf(Date);
  });
});
