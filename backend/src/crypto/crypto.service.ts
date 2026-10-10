import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

/** v1: AES-256-GCM, format `enc:v1:iv:tag:ct` (base64url). */
const PREFIX = 'enc:v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
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
   * Decrypts a value produced by {@link encrypt}.
   *
   * A value that does not carry the `enc:v1:` prefix is legacy plaintext and is
   * returned unchanged. A value that carries the prefix but fails the GCM
   * authentication tag has been tampered with or was encrypted with a different
   * key — that is a security failure, so it throws rather than silently emitting
   * ciphertext as if it were plaintext.
   */
  decrypt(input: string | null | undefined): string | null | undefined {
    if (!input || !input.startsWith(`${PREFIX}:`)) return input;

    // base64url never contains ':', so everything past "enc:v1:"
    // is exactly `iv:tag:ct`.
    const parts = input.slice(PREFIX.length + 1).split(':');
    if (parts.length !== 3) {
      throw new Error('Ciphertext is malformed (expected iv:tag:ct)');
    }
    const [ivB64, tagB64, ctB64] = parts;

    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ct = Buffer.from(ctB64, 'base64url');

    // GCM's authentication guarantee depends on the tag being the full length
    // the mode produces. Accepting a shorter tag would let a truncated
    // (forged) tag be treated as valid, so both the IV and the tag are length
    // checked before Node ever sees them.
    if (iv.length !== IV_BYTES) {
      throw new Error(`Ciphertext IV must be ${IV_BYTES} bytes, got ${iv.length}`);
    }
    if (tag.length !== TAG_BYTES) {
      throw new Error(
        `Authentication tag must be ${TAG_BYTES} bytes, got ${tag.length}`,
      );
    }

    try {
      const decipher = createDecipheriv(ALGO, this.key, iv);
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
      return pt.toString('utf8');
    } catch {
      throw new Error(
        'Ciphertext failed authentication — tampered value or wrong encryption key',
      );
    }
  }
}