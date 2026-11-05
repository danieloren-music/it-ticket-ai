import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { clientIp, HttpError, rateLimit, readJson, route, str } from '@/lib/http';
import { db, must } from '@/lib/db';
import { hashPassword, passwordPolicyError } from '@/lib/password';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  rateLimit(`platform:password-reset:complete:${ip}`, 10, 15 * 60_000);

  const body = await readJson(req);
  const token = str(body.token, 64, { min: 64, trim: false, field: 'Reset token' });
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new HttpError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or expired.');
  }
  const password = str(body.password, 128, { min: 1, trim: false, field: 'Password' });
  if (passwordPolicyError(password)) {
    throw new HttpError(400, 'WEAK_PASSWORD', 'Password must be at least 10 characters and include letters and digits');
  }

  const tokenHash = sha256(token);
  const now = new Date().toISOString();
  const reset = must(
    await db().from('platform_password_resets')
      .select('admin_email')
      .eq('token_hash', tokenHash)
      .gt('expires_at', now)
      .maybeSingle()
  );
  if (!reset) throw new HttpError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or expired.');

  const passwordHash = await hashPassword(password);
  const consumed = must(
    await db().from('platform_password_resets')
      .delete()
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .select('admin_email')
      .maybeSingle()
  );
  if (!consumed) throw new HttpError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or expired.');

  const changedAt = new Date().toISOString();
  const { data: admin, error } = await db().from('platform_admins')
    .update({
      password_hash: passwordHash,
      password_changed_at: changedAt,
      failed_attempts: 0,
      locked_until: null,
      updated_at: changedAt,
    })
    .eq('email', consumed.admin_email)
    .select('email')
    .maybeSingle();
  if (error) throw new Error(`Could not update platform password: ${error.message}`);
  if (!admin) throw new HttpError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or expired.');

  must(await db().from('platform_password_resets').delete().eq('admin_email', admin.email));
  await audit({
    actor: admin.email,
    action: 'platform.password_reset_completed',
    target: admin.email,
    ip,
  });
  return NextResponse.json({ success: true });
});
