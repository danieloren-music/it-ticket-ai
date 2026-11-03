import { NextRequest, NextResponse } from 'next/server';
import { route, readJson, rateLimit, clientIp, bad, HttpError } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { ruleBasedClassify, runAssistant, aiConfigured } from '@/lib/gemini';

/** Conversational ticket assistant for signed-in employees. */
export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  rateLimit(`ai:${session.tenantId}:${session.sub}`, session.demo ? 20 : 60, 60 * 60_000);
  if (session.demo) rateLimit(`ai:demo-ip:${clientIp(req)}`, 30, 60 * 60_000);

  const body = await readJson(req);

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .slice(-12)
    .map((m: unknown) => {
      const r = m as { role?: string; content?: unknown };
      return {
        role: r.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: typeof r.content === 'string' ? r.content.slice(0, 1500) : '',
      };
    })
    .filter((m: { content: string }) => m.content.trim());
  if (!messages.length) throw bad('VALIDATION', 'A message is required');

  const language = body.language === 'en' ? 'en' : 'he';
  const currentFormData = body.currentFormData && typeof body.currentFormData === 'object' && !Array.isArray(body.currentFormData)
    ? body.currentFormData as Record<string, unknown>
    : {};

  if (session.demo) {
    const description = messages.filter((message) => message.role === 'user')
      .map((message) => message.content).join('\n').slice(0, 2000);
    const result = ruleBasedClassify(description, language);
    const userTurns = messages.filter((message) => message.role === 'user').length;
    return NextResponse.json({
      title: result.title,
      description,
      category: result.category,
      urgency: result.urgency,
      system_impacted: result.system_impacted,
      assigned_team: result.assigned_team,
      user_city: typeof currentFormData.user_city === 'string' ? currentFormData.user_city : '',
      follow_up_question: userTurns < 2
        ? language === 'he'
          ? 'באיזה מיקום זה קורה, והאם הבעיה משפיעה גם על אנשים נוספים?'
          : 'Where is this happening, and is anyone else affected?'
        : null,
      source: 'simulation',
    });
  }

  if (!aiConfigured()) throw new HttpError(503, 'AI_UNAVAILABLE', 'AI assistant is not configured');

  try {
    const result = await runAssistant({ messages, currentFormData, language });
    return NextResponse.json({ ...result, source: 'ai' });
  } catch (err) {
    console.error('[ai-parse]', err);
    throw new HttpError(502, 'AI_FAILED', 'The AI assistant could not process this request');
  }
});
