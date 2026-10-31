import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, KEYLEN, { N, r: R, p: P }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** scrypt$N$r$p$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

const sha = (v: string) => createHash('sha256').update(v).digest();

export interface VerifyResult {
  ok: boolean;
  /** stored value was a legacy plaintext password – caller should store a fresh hash */
  needsRehash: boolean;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<VerifyResult> {
  if (!stored) return { ok: false, needsRehash: false };

  if (stored.startsWith('scrypt$')) {
    const [, n, r, p, saltB64, hashB64] = stored.split('$');
    if (Number(n) !== N || Number(r) !== R || Number(p) !== P || !saltB64 || !hashB64) {
      return { ok: false, needsRehash: false };
    }
    const expected = Buffer.from(hashB64, 'base64');
    const actual = await scrypt(password, Buffer.from(saltB64, 'base64'));
    return { ok: expected.length === actual.length && timingSafeEqual(expected, actual), needsRehash: false };
  }

  // Legacy plaintext rows (pre-hardening). Constant-time compare, then migrate on success.
  const ok = timingSafeEqual(sha(password), sha(stored));
  return { ok, needsRehash: ok };
}

/** Returns an error code or null when the password is acceptable. */
export function passwordPolicyError(pw: unknown): string | null {
  if (typeof pw !== 'string') return 'WEAK_PASSWORD';
  if (pw.length < 10 || pw.length > 128) return 'WEAK_PASSWORD';
  if (!/[A-Za-z\u0590-\u05FF]/.test(pw) || !/\d/.test(pw)) return 'WEAK_PASSWORD';
  return null;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Human-friendly one-time password (no look-alike chars), always satisfies the policy. */
export function generateTempPassword(length = 14): string {
  let out = '';
  for (let i = 0; i < length - 2; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `${out}${randomInt(2, 10)}${ALPHABET[randomInt(ALPHABET.length)]}`;
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}
