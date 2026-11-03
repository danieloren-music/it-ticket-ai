import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { HttpError, route, readJson, str, email, rateLimit, clientIp } from '@/lib/http';

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

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  if (!apiKey || !from || !to) {
    throw new HttpError(503, 'CONTACT_EMAIL_NOT_CONFIGURED', 'Contact email is not configured');
  }

  const { error } = await db().from('contact_requests').insert(row);
  if (error) {
    console.error('[contact] insert failed:', error.message);
    throw new Error('Could not save contact request');
  }

  try {
    const { error: sendError } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: row.email,
      subject: 'New SmartQ contact request',
      text: [
        `Name: ${row.name}`,
        `Email: ${row.email}`,
        `Organization: ${row.company}`,
        row.phone ? `Phone: ${row.phone}` : '',
        row.message ? `Message: ${row.message}` : '',
      ].filter(Boolean).join('\n'),
    });
    if (sendError) throw new Error(sendError.message);
  } catch (error) {
    console.error('[contact] Resend notification failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new HttpError(502, 'CONTACT_NOTIFICATION_FAILED', 'Your request was saved, but its email notification could not be sent');
  }

  return NextResponse.json({ success: true }, { status: 201 });
});
