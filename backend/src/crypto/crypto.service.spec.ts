import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from './crypto.service.js';

describe('CryptoService', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY =
      'REMOVED-ENCRYPTION-KEY-ROTATE-IMMEDIATELY=';
  });

  it('throws when ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => new CryptoService()).toThrow(/ENCRYPTION_KEY/);
  });

  it('throws when ENCRYPTION_KEY is not 32 bytes of base64', () => {
    process.env.ENCRYPTION_KEY = 'c2hvcnQ=';
    expect(() => new CryptoService()).toThrow(/32 bytes/);
  });

  it('round-trips a string to non-plaintext ciphertext', () => {
    const svc = new CryptoService();
    const cipher = svc.encrypt('Nguyễn Văn A');
    expect(cipher.startsWith('enc:v1:')).toBe(true);
    expect(cipher).not.toContain('Nguyễn Văn A');
    expect(svc.decrypt(cipher)).toBe('Nguyễn Văn A');
  });

  it('uses a fresh IV per encryption', () => {
    const svc = new CryptoService();
    expect(svc.encrypt('same value')).not.toBe(svc.encrypt('same value'));
  });

  it('leaves legacy plaintext / empty values untouched', () => {
    const svc = new CryptoService();
    expect(svc.decrypt('plaintext-log')).toBe('plaintext-log');
    expect(svc.decrypt(null)).toBe(null);
    expect(svc.decrypt(undefined)).toBe(undefined);
  });

  it('returns stored value when ciphertext is tampered', () => {
    const svc = new CryptoService();
    const cipher = svc.encrypt('secret');
    const bogus = cipher.slice(0, -3) + '000';
    expect(svc.decrypt(bogus)).toBe(bogus);
  });

  it('does not decrypt with a different key', () => {
    const svc = new CryptoService();
    const cipher = svc.encrypt('secret');
    process.env.ENCRYPTION_KEY = 'd3Jvbmcga2V5IGJ1dCAzMiBieXRlcyBub3doZXJlISE=';
    const other = new CryptoService();
    expect(other.decrypt(cipher)).toBe(cipher);
  });
});