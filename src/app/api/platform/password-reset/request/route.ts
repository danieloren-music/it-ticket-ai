import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { audit } from '@/lib/audit';
import { baseUrl, clientIp, email, HttpError, rateLimit, readJson, route } from '@/lib/http';
import { db, must } from '@/lib/db';
import { randomToken } from '@/lib/password';

const TOKEN_TTL_MS = 30 * 60_000;
const RESPONSE_MESSAGE = 'If an account exists for that email, a reset link will be sent.';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  rateLimit(`platform:password-reset:ip:${ip}`, 5, 60 * 60_000);

  const body = await readJson(req);
  const adminEmail = email(body.email);
  rateLimit(`platform:password-reset:account:${sha256(adminEmail)}`, 3, 60 * 60_000);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new HttpError(503, 'PASSWORD_RESET_EMAIL_FAILED', 'Password reset email is not configured');
  }

  const admin = must(
    await db().from('platform_admins')
      .select('email, full_name')
      .eq('email', adminEmail)
      .maybeSingle()
  );
  if (!admin) return NextResponse.json({ success: true, message: RESPONSE_MESSAGE });

  const token = randomToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  must(await db().from('platform_password_resets').delete().eq('admin_email', admin.email));
  must(await db().from('platform_password_resets').insert({
    admin_email: admin.email,
    token_hash: tokenHash,
    expires_at: expiresAt,
  }));

  const resetUrl = `${baseUrl(req)}/platform/reset-password#token=${token}`;
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: admin.email,
      subject: 'Reset your SmartQ Platform password',
      text: [
        `Hello ${admin.full_name || admin.email},`,
        '',
        'Use the link below to set a new password. It can only be used once and expires in 30 minutes.',
        '',
        resetUrl,
        '',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    const cleanup = await db().from('platform_password_resets').delete().eq('token_hash', tokenHash);
    if (cleanup.error) console.error('[platform-password-reset] token cleanup failed:', cleanup.error.message);
    console.error(
      '[platform-password-reset] email delivery failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw new HttpError(502, 'PASSWORD_RESET_EMAIL_FAILED', 'Could not send the password reset email');
  }

  await audit({
    actor: admin.email,
    action: 'platform.password_reset_requested',
    target: admin.email,
    ip,
  });
  return NextResponse.json({ success: true, message: RESPONSE_MESSAGE });
});
