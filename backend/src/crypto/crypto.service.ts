import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

/** Salt v1: AES-256-GCM, format `enc:v1:iv:tag:ct` (base64url). */
const PREFIX = 'enc:v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.ENCRYPTION_KEY;
    const key = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
    if (!raw || key.length !== KEY_BYTES) {
      throw new Error(
        'ENCRYPTION_KEY is required and must be base64 of exactly 32 bytes',
      );
    }
    this.key = key;
  }

  encrypt(input: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ct = Buffer.concat([cipher.update(input, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      PREFIX,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ct.toString('base64url'),
    ].join(':');
  }

  /**
   * Decrypts a value produced by {@link encrypt}. Values that are empty or
   * were stored before encryption was enabled are returned unchanged, so
   * legacy plaintext rows stay readable.
   */
  decrypt(input: string | null | undefined): string | null | undefined {
    if (!input || !input.startsWith(`${PREFIX}:`)) return input;

    // base64url never contains ':', so everything past "enc:v1:"
    // is exactly `iv:tag:ct`.
    const parts = input.slice(PREFIX.length + 1).split(':');
    if (parts.length !== 3) return input;
    const [ivB64, tagB64, ctB64] = parts;

    try {
      const decipher = createDecipheriv(
        ALGO,
        this.key,
        Buffer.from(ivB64, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
      const pt = Buffer.concat([
        decipher.update(Buffer.from(ctB64, 'base64url')),
        decipher.final(),
      ]);
      return pt.toString('utf8');
    } catch {
      // Tampered value or wrong key — surface the stored value untouched
      // rather than crashing read paths.
      return input;
    }
  }
}