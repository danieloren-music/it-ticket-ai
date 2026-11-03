import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_BYTES = 32;
const IV_BYTES = 12;

function encryptionKey(): Buffer {
  const encoded = process.env.IDP_ENCRYPTION_KEY;
  if (!encoded) throw new Error('IDP_ENCRYPTION_KEY is not configured.');

  const key = Buffer.from(encoded, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error('IDP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

export function encryptIdpSecret(secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptIdpSecret(value: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = value.split('.');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext || extra !== undefined) {
    throw new Error('Stored identity-provider secret has an unsupported format.');
  }

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(encodedIv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
