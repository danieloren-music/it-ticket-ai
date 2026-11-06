export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: Record<string, unknown>) {
    super(message);
  }
}

/** Typed fetch wrapper: JSON in/out, throws ApiError with the server's error code. */
export async function api<T = Record<string, unknown>>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: 'same-origin',
  });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    throw new ApiError(res.status, String(data.code ?? 'ERROR'), String(data.error ?? res.statusText), data);
  }
  return data as T;
}

const MESSAGES: Record<string, { he: string; en: string }> = {
  INVALID_CREDENTIALS: { he: 'אימייל או סיסמה שגויים', en: 'Incorrect email or password' },
  ACCOUNT_LOCKED: { he: 'החשבון ננעל זמנית עקב ניסיונות כושלים. נסו שוב בעוד כמה דקות.', en: 'Account temporarily locked after failed attempts. Try again in a few minutes.' },
  ACCOUNT_DISABLED: { he: 'החשבון הושבת. פנו למנהל המערכת.', en: 'This account is disabled. Contact your administrator.' },
  RATE_LIMITED: { he: 'יותר מדי בקשות. נסו שוב בעוד רגע.', en: 'Too many requests. Please try again shortly.' },
  UNAUTHENTICATED: { he: 'פג תוקף החיבור. התחברו מחדש.', en: 'Your session has expired. Please sign in again.' },
  FORBIDDEN: { he: 'אין לכם הרשאה לבצע פעולה זו', en: 'You do not have permission to do this' },
  DEMO_READONLY: { he: 'הפעולה מושבתת בסביבת ההדגמה הציבורית', en: 'This action is disabled in the public demo' },
  WEAK_PASSWORD: { he: 'הסיסמה חייבת להכיל לפחות 10 תווים, כולל אותיות וספרות', en: 'Password must be at least 10 characters with letters and digits' },
  SAME_PASSWORD: { he: 'הסיסמה החדשה חייבת להיות שונה מהנוכחית', en: 'The new password must differ from the current one' },
  LAST_MANAGER: { he: 'חייב להישאר לפחות מנהל פעיל אחד בארגון', en: 'The organization must keep at least one active manager' },
  CANNOT_DELETE_SELF: { he: 'לא ניתן למחוק את החשבון המחובר', en: 'You cannot delete your own account' },
  AI_UNAVAILABLE: { he: 'עוזר ה-AI אינו זמין כרגע', en: 'The AI assistant is currently unavailable' },
  AI_FAILED: { he: 'העוזר החכם לא הצליח לעבד את הבקשה. נסו שוב.', en: 'The AI assistant could not process the request. Please try again.' },
  CONTACT_EMAIL_NOT_CONFIGURED: { he: 'טופס יצירת הקשר אינו מוגדר כרגע. אפשר לנסות שוב מאוחר יותר.', en: 'The contact form is not configured right now. Please try again later.' },
  CONTACT_NOTIFICATION_FAILED: { he: 'הפנייה נשמרה במערכת, אבל הודעת ההתראה לא נשלחה. אין צורך לשלוח שוב — צוות SmartQ יבדוק את הפנייה דרך לוח הניהול.', en: 'Your request was saved, but the notification email failed. Please do not submit again; the SmartQ team can review it in the admin console.' },
  PASSWORD_RESET_EMAIL_FAILED: { he: 'שליחת הודעת איפוס הסיסמה נכשלה. נסו שוב מאוחר יותר.', en: 'Could not send the password reset email. Please try again later.' },
  INVALID_RESET_TOKEN: { he: 'קישור האיפוס אינו תקף או שפג תוקפו. בקשו קישור חדש.', en: 'This reset link is invalid or expired. Request a new one.' },
  DEMO_BUSY: { he: 'ההדגמה עמוסה כרגע, נסו שוב מאוחר יותר', en: 'The live demo is busy, please try again later' },
  TENANT_UNAVAILABLE: { he: 'הארגון אינו זמין כרגע. פנו למנהל המערכת.', en: 'This organization is currently unavailable. Contact your administrator.' },
  TICKET_CLOSED: { he: 'הקריאה סגורה', en: 'This ticket is closed' },
  CSRF: { he: 'הבקשה נחסמה מטעמי אבטחה', en: 'Request blocked for security reasons' },
  NOT_FOUND: { he: 'הפריט לא נמצא', en: 'Not found' },
  RESERVED_SLUG: { he: 'מזהה הארגון שמור למערכת', en: 'This organization ID is reserved' },
};

export function errorText(err: unknown, lang: 'he' | 'en'): string {
  if (err instanceof ApiError) {
    const m = MESSAGES[err.code];
    if (m) return m[lang];
    if (err.code === 'VALIDATION' || err.code === 'READ_ONLY_ROLE') return err.message;
    return lang === 'he' ? 'אירעה שגיאה. נסו שוב.' : 'Something went wrong. Please try again.';
  }
  return lang === 'he' ? 'אירעה שגיאה. נסו שוב.' : 'Something went wrong. Please try again.';
}
