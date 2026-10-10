import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from './crypto.service.js';

/** A 32-byte base64 key generated per test. Never a stored credential. */
function testKey(): string {
  return randomBytes(32).toString('base64');
}

describe('CryptoService', () => {
  beforeEach(() => {
    // The service reads the key from the environment on construction, so a
    // fresh throwaway key is generated for each test. This keeps real key
    // material out of the repository.
    process.env.ENCRYPTION_KEY = testKey();
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

  it('emits a 12-byte IV and a 16-byte tag', () => {
    const svc = new CryptoService();
    // Format is "enc:v1:iv:tag:ct"; the prefix itself contains a colon.
    const [iv, tag] = svc.encrypt('value').split(':').slice(2);
    expect(Buffer.from(iv, 'base64url').length).toBe(12);
    expect(Buffer.from(tag, 'base64url').length).toBe(16);
  });

  it('leaves legacy plaintext / empty values untouched', () => {
    const svc = new CryptoService();
    expect(svc.decrypt('plaintext-log')).toBe('plaintext-log');
    expect(svc.decrypt(null)).toBe(null);
    expect(svc.decrypt(undefined)).toBe(undefined);
  });

  it('throws when ciphertext is tampered', () => {
    const svc = new CryptoService();
    const cipher = svc.encrypt('secret');
    const bogus = cipher.slice(0, -3) + '000';
    // GCM exists to authenticate: a modified tag must fail loudly instead of
    // being handed back as if it were plaintext.
    expect(() => svc.decrypt(bogus)).toThrow(/failed authentication/);
  });

  it('throws when the authentication tag is truncated', () => {
    const svc = new CryptoService();
    const [prefix, version, iv, tag, ct] = svc.encrypt('secret').split(':');
    // A shortened tag must be rejected before Node can accept it as valid.
    const shortTag = Buffer.from(tag, 'base64url').subarray(0, 12);
    const mangled = [prefix, version, iv, shortTag.toString('base64url'), ct].join(':');
    expect(() => svc.decrypt(mangled)).toThrow(/Authentication tag/);
  });

  it('throws when the IV is truncated', () => {
    const svc = new CryptoService();
    const [prefix, version, iv, tag, ct] = svc.encrypt('secret').split(':');
    const shortIv = Buffer.from(iv, 'base64url').subarray(0, 8);
    const mangled = [prefix, version, shortIv.toString('base64url'), tag, ct].join(':');
    expect(() => svc.decrypt(mangled)).toThrow(/IV/);
  });

  it('does not decrypt with a different key', () => {
    const svc = new CryptoService();
    const cipher = svc.encrypt('secret');
    process.env.ENCRYPTION_KEY = testKey();
    const other = new CryptoService();
    expect(() => other.decrypt(cipher)).toThrow(/failed authentication/);
  });
});
