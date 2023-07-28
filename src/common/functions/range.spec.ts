import { range } from '~/common/functions/range';
import { describe, expect, it } from 'vitest';

describe('Range', () => {
  it('should return 0...1', () => {
    expect(range(0, 1)).toEqual([0, 1]);
  });
  it('should return 1...5', () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should return 1, with (1, 1)', () => {
    expect(range(1, 1)).toEqual([1]);
  });
  it('should throw Invalid range with (1, 0)', () => {
    expect(() => range(1, 0)).toThrow('Invalid range');
  });
});
