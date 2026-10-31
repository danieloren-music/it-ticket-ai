import { NextRequest, NextResponse } from 'next/server';
import { route, readJson, rateLimit, clientIp, bad, HttpError } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { runAssistant, aiConfigured } from '@/lib/gemini';

/** Conversational ticket assistant for signed-in employees. */
export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  rateLimit(`ai:${session.tenantId}:${session.sub}`, session.demo ? 20 : 60, 60 * 60_000);
  if (session.demo) rateLimit(`ai:demo-ip:${clientIp(req)}`, 30, 60 * 60_000);

  const body = await readJson(req);
  if (!aiConfigured()) throw new HttpError(503, 'AI_UNAVAILABLE', 'AI assistant is not configured');

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
  const currentFormData = body.currentFormData && typeof body.currentFormData === 'object' ? body.currentFormData : {};

  try {
    const result = await runAssistant({ messages, currentFormData: currentFormData as Record<string, unknown>, language });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ai-parse]', err);
    throw new HttpError(502, 'AI_FAILED', 'The AI assistant could not process this request');
  }
});
