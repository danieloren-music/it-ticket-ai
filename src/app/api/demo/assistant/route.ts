import { NextRequest, NextResponse } from 'next/server';
import { route, readJson, rateLimit, clientIp, str, bad, HttpError } from '@/lib/http';
import { CATEGORIES, isOneOf, SLA_HOURS, TEAMS, URGENCIES } from '@/lib/constants';
import { demoEnabled } from '@/lib/demo';
import { ruleBasedClassify } from '@/lib/gemini';

export const POST = route(async (req: NextRequest) => {
  if (!demoEnabled()) throw new HttpError(404, 'DEMO_DISABLED', 'Demo is disabled');

  const ip = clientIp(req);
  rateLimit(`demo:assistant:${ip}`, 12, 60 * 60_000);
  rateLimit(`demo:assistant:burst:${ip}`, 4, 60_000);

  const body = await readJson(req);
  const language = body.language === 'en' ? 'en' : 'he';
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 24) {
    throw bad('VALIDATION', 'A conversation with up to 24 messages is required');
  }

  const messages: { role: 'user' | 'assistant'; content: string }[] = body.messages.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw bad('VALIDATION', 'Invalid chat message');
    const message = value as { role?: unknown; content?: unknown };
    const role = message.role;
    if (role !== 'user' && role !== 'assistant') throw bad('VALIDATION', 'Invalid chat role');
    return {
      role,
      content: str(message.content, 1200, { min: 1, field: 'Message' }),
    };
  });
  if (messages[messages.length - 1].role !== 'user') throw bad('VALIDATION', 'The latest message must be from the user');

  const userMessages = messages.filter((message) => message.role === 'user');
  const description = userMessages.map((message) => message.content).join('\n').slice(0, 2000);
  if (userMessages.length < 2) {
    return NextResponse.json({
      reply: language === 'he'
        ? 'הבנתי. כדי לדייק את הקריאה, באיזה מיקום זה קורה והאם זה משפיע רק עליך או על אנשים נוספים?'
        : 'Got it. To make the ticket more useful, where is this happening, and is it affecting only you or other people too?',
      ticket: null,
      source: 'simulation',
    });
  }

  const result = ruleBasedClassify(description, language);
  const ticket: {
    title: string;
    description: string;
    category: (typeof CATEGORIES)[number];
    urgency: (typeof URGENCIES)[number];
    assigned_team: (typeof TEAMS)[number];
    system_impacted: string;
    sla_hours: number;
  } = {
    title: result.title.slice(0, 120),
    description,
    category: isOneOf(CATEGORIES, result.category) ? result.category : 'General IT Request',
    urgency: isOneOf(URGENCIES, result.urgency) ? result.urgency : 'Medium',
    assigned_team: isOneOf(TEAMS, result.assigned_team) ? result.assigned_team : 'Helpdesk Tier 1',
    system_impacted: result.system_impacted.slice(0, 120),
    sla_hours: SLA_HOURS[isOneOf(URGENCIES, result.urgency) ? result.urgency : 'Medium'],
  };
  return NextResponse.json({
    reply: language === 'he'
      ? 'תודה, יש לי את הפרטים. סיכמתי אותם בטיוטת הקריאה — אפשר לבדוק את הסיווג והדחיפות.'
      : 'Thanks, I have the details. I summarized them in the request draft so you can review the category and priority.',
    ticket,
    source: 'simulation',
  });
});
