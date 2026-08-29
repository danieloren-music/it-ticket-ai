import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantSlug, email, password, role } = body;

    if (!tenantSlug || !email || !password) {
      return NextResponse.json({ error: 'נא למלא את כל השדות' }, { status: 400 });
    }

    if (password !== 'SmartQ2026!') {
      return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
    }

    const assignedRole = role || 'manager';
    const userName = email.split('@')[0];

    const sessionPayload = {
      email,
      name: userName,
      role: assignedRole,
      tenantId: tenantSlug.toLowerCase(),
      createdAt: new Date().toISOString()
    };

    const cookieVal = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const res = NextResponse.json({
      success: true,
      user: sessionPayload
    });

    // כתיבת Cookie גלובלי עם Path=/ שתקף לכל הנתיבים
    res.cookies.set('smartq_session', cookieVal, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'שגיאת שרת' }, { status: 500 });
  }
}