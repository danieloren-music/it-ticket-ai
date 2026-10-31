import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { route, readJson, str, email, rateLimit, clientIp } from '@/lib/http';

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  rateLimit(`contact:${ip}`, 5, 60 * 60_000);
  const body = await readJson(req);

  // Honeypot: real people never fill the hidden field.
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ success: true });

  const row = {
    name: str(body.name, 120, { min: 2, field: 'Name' }),
    email: email(body.email),
    company: str(body.company, 160, { min: 2, field: 'Company' }),
    phone: str(body.phone, 40),
    message: str(body.message, 2000),
    ip,
  };
  const { error } = await db().from('contact_requests').insert(row);
  if (error) {
    console.error('[contact] insert failed:', error.message);
    throw new Error('Could not save contact request');
  }
  return NextResponse.json({ success: true }, { status: 201 });
});
