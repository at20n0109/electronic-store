import { describe, expect, it } from 'vitest';
import { slugify } from './slug.util.js';

describe('slugify', () => {
  it('normalizes lowercase and trims', () => {
    expect(slugify('  AMD Ryzen 7  ')).toBe('amd-ryzen-7');
  });

  it('replaces non-alphanumeric runs with a single dash', () => {
    expect(slugify('Intel Core   i5-14600KF!!!')).toBe(
      'intel-core-i5-14600kf',
    );
  });

  it('strips Vietnamese diacritics', () => {
    expect(slugify('Vỏ máy ATX Đẹp')).toBe('vo-may-atx-dep');
  });

  it('strips leading and trailing dashes', () => {
    expect(slugify('---GPU RTX 4060---')).toBe('gpu-rtx-4060');
  });

  it('falls back for empty results', () => {
    expect(slugify('!!!')).toBe('item');
  });
});