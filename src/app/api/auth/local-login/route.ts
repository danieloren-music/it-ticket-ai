import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { tenantSlug, email, password, role } = await req.json();

    if (!tenantSlug || !email || !password) {
      return NextResponse.json({ error: 'נא למלא את כל השדות' }, { status: 400 });
    }

    // שליפת פרטי הארגון
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantSlug)
      .single();

    if (error || !tenant || tenant.status === 'suspended') {
      return NextResponse.json({ error: 'הארגון אינו קיים או מושעה' }, { status: 404 });
    }

    // בדיקת סיסמה (בדיקת סיסמת הארגון או סיסמת ברירת מחדל ראשונית)
    const expectedPassword = tenant.admin_password || 'SmartQ2026!';
    if (password !== expectedPassword) {
      return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
    }

    // קביעת תפקיד (ברירת מחדל: manager אם זה אימייל המנהל, או לפי בחירה)
    const assignedRole = role || (email === tenant.admin_email ? 'manager' : 'admin');

    const sessionData = {
      email,
      name: email.split('@')[0],
      role: assignedRole,
      tenantId: tenantSlug,
      exp: Date.now() + 1000 * 60 * 60 * 12, // 12 שעות
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const res = NextResponse.json({ success: true, role: assignedRole });
    res.cookies.set('smartq_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: 'שגיאה בהתחברות: ' + err.message }, { status: 500 });
  }
}