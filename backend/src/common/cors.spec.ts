import { describe, expect, it } from 'vitest';
import {
  isWildcardOrigin,
  parseCorsOrigins,
  splitOrigins,
} from './cors.js';

describe('splitOrigins', () => {
  it('splits on commas and trims whitespace', () => {
    expect(splitOrigins('https://a.example, https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('drops empty segments from a trailing or doubled comma', () => {
    expect(splitOrigins('https://a.example,,')).toEqual(['https://a.example']);
  });

  it('returns an empty list for missing or blank input', () => {
    expect(splitOrigins(undefined)).toEqual([]);
    expect(splitOrigins('   ')).toEqual([]);
  });
});

describe('isWildcardOrigin', () => {
  it('flags entries containing an asterisk', () => {
    expect(isWildcardOrigin('https://*.example.com')).toBe(true);
    expect(isWildcardOrigin('*')).toBe(true);
    expect(isWildcardOrigin('https://pcstore.example.com')).toBe(false);
  });
});

describe('parseCorsOrigins', () => {
  it('keeps exact origins as plain strings', () => {
    const { origins, error } = parseCorsOrigins('https://a.example,https://b.example');
    expect(error).toBeNull();
    expect([...origins]).toEqual(['https://a.example', 'https://b.example']);
  });

  it('rejects a wildcard entry instead of compiling it to a RegExp', () => {
    const { origins, error } = parseCorsOrigins('https://*.example.com');
    expect(origins.size).toBe(0);
    expect(error).toMatch(/must list exact origins/);
    expect(error).toContain('https://*.example.com');
  });

  it('keeps the non-wildcard entries when one entry is a pattern', () => {
    const { origins, error } = parseCorsOrigins(
      'https://good.example,https://*.evil.example',
    );
    expect([...origins]).toEqual(['https://good.example']);
    expect(error).toContain('https://*.evil.example');
  });

  it('reports an empty allowlist for missing configuration', () => {
    const { origins, error } = parseCorsOrigins(undefined);
    expect(origins.size).toBe(0);
    expect(error).toBeNull();
  });

  it('does not treat a path or port in an origin as a pattern', () => {
    const { error } = parseCorsOrigins('http://localhost:3000');
    expect(error).toBeNull();
  });
});
