import { NextRequest, NextResponse } from 'next/server';
import { route, readJson, rateLimit, clientIp, str } from '@/lib/http';
import { ruleBasedClassify } from '@/lib/gemini';
import { demoEnabled } from '@/lib/demo';
import { HttpError } from '@/lib/http';
import { SLA_HOURS } from '@/lib/constants';

/** Public, rate-limited "Try SmartQ" classifier shown on the home page. */
export const POST = route(async (req: NextRequest) => {
  if (!demoEnabled()) throw new HttpError(404, 'DEMO_DISABLED', 'Demo is disabled');

  const ip = clientIp(req);
  rateLimit(`demo:classify:${ip}`, 12, 60 * 60_000);
  rateLimit(`demo:classify:burst:${ip}`, 4, 60_000);

  const body = await readJson(req);
  const text = str(body.text, 500, { min: 6, field: 'Text' });
  const language = body.language === 'en' ? 'en' : 'he';

  const result = ruleBasedClassify(text, language);
  return NextResponse.json({ ...result, sla_hours: SLA_HOURS[result.urgency], source: 'simulation' });
});
