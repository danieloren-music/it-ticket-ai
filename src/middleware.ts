import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // נתיבים פטורים מבדיקת Tenant
  if (
    pathname.startsWith('/home') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/smartq-logo.png') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/' ||
    pathname === '/_not-found'
  ) {
    return NextResponse.next();
  }

  // בדיקת מבנה הנתיב: /[tenant] או /[tenant]/[view]
  const match = pathname.match(/^\/([^\/]+)(?:\/(manage|admins|users))?/);

  if (!match) {
    return NextResponse.next();
  }

  const tenantSlug = match[1];
  const view = match[2]; // manage | admins | users | undefined

  // 1. אימות קיום הארגון מול Supabase REST API (עובד ישירות ב-Edge Middleware)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/tenants?id=eq.${encodeURIComponent(tenantSlug)}&select=id,status`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          // Cache קצר לביצועים גבוהים ב-Edge
          next: { revalidate: 30 },
        }
      );

      const tenants = await checkRes.json();

      // אם הארגון לא קיים במסד הנתונים או שהוא מושעה
      if (!Array.isArray(tenants) || tenants.length === 0) {
        return NextResponse.rewrite(new URL('/_not-found', req.url));
      }

      if (tenants[0].status === 'suspended') {
        return new NextResponse(
          'הסביבה של ארגון זה הושעתה זמנית על ידי מנהל המערכת. אנא פנה לתמיכה.',
          { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        );
      }
    } catch (e) {
      console.error('Error validating tenant existence:', e);
    }
  }

  // 2. אם ניגשו ישירות ל-/[tenant] ללא תת-נתיב -> הפניה אוטומטית ל-/[tenant]/users
  if (!view) {
    return NextResponse.redirect(new URL(`/${tenantSlug}/users`, req.url));
  }

  // 3. אכיפת הרשאות SAML / Session עבור נתיבי IT
  const sessionCookie = req.cookies.get('smartq_session')?.value;
  let session: { role: 'manager' | 'admin' | 'user'; tenantId: string; email: string } | null = null;

  if (sessionCookie) {
    try {
      session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
    } catch {
      session = null;
    }
  }

  // בדיקת הרשאות ל-manage
  if (view === 'manage') {
    if (!session || session.tenantId !== tenantSlug || session.role !== 'manager') {
      const loginUrl = new URL('/api/auth/saml/login', req.url);
      loginUrl.searchParams.set('tenant', tenantSlug);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // בדיקת הרשאות ל-admins
  if (view === 'admins') {
    if (
      !session ||
      session.tenantId !== tenantSlug ||
      (session.role !== 'manager' && session.role !== 'admin')
    ) {
      const loginUrl = new URL('/api/auth/saml/login', req.url);
      loginUrl.searchParams.set('tenant', tenantSlug);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};