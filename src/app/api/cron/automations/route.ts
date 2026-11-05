import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runScheduledAutomations } from '@/lib/automations';
import { HttpError, route } from '@/lib/http';

export const runtime = 'nodejs';

function matchesSecret(expected: string, provided: string): boolean {
  const left = createHash('sha256').update(expected).digest();
  const right = createHash('sha256').update(provided).digest();
  return timingSafeEqual(left, right);
}

export const POST = route(async (req: NextRequest) => {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 32) {
    throw new HttpError(503, 'CRON_NOT_CONFIGURED', 'Scheduled automations require a CRON_SECRET of at least 32 characters');
  }
  const provided = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!matchesSecret(expected, provided)) throw new HttpError(401, 'INVALID_CRON_SECRET', 'Invalid scheduler credential');
  const result = await runScheduledAutomations();
  return NextResponse.json({ success: result.failed === 0, ...result });
});
