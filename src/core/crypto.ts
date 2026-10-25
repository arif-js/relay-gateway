import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

/**
 * Derives a 32-byte key. A real key is used as-is when it decodes to 32 bytes;
 * anything else (including the dev placeholder) is stretched with scrypt so the
 * same input always yields the same key.
 */
function deriveKey(secret: string): Buffer {
  const trimmed = secret.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return Buffer.from(trimmed, 'hex');
  const b64 = trimmed.match(/^[A-Za-z0-9+/]{43}=$/);
  if (b64) {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32) return buf;
  }
  return scryptSync(trimmed, 'relay-gateway:v1', 32);
}

export interface Sealer {
  seal(plaintext: string): string;
  open(ciphertext: string): string;
}

/**
 * AES-256-GCM. The sealed form is `v1.<iv>.<tag>.<ciphertext>`, all base64url.
 */
export function createSealer(secret: string): Sealer {
  const key = deriveKey(secret);
  return {
    seal(plaintext: string): string {
      const iv = randomBytes(IV_LEN);
      const cipher = createCipheriv(ALGO, key, iv);
      const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return [
        'v1',
        iv.toString('base64url'),
        tag.toString('base64url'),
        enc.toString('base64url'),
      ].join('.');
    },
    open(ciphertext: string): string {
      const parts = ciphertext.split('.');
      if (parts.length !== 4 || parts[0] !== 'v1') {
        throw new Error('Sealed value is not in a recognised format');
      }
      const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];
      const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    },
  };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Timing-safe comparison for secrets of equal expected length. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
