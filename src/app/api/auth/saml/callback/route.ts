import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayStateParam = formData.get('RelayState') as string;

    if (!samlResponse) {
      return NextResponse.json({ error: 'חסר SAMLResponse בבקשה' }, { status: 400 });
    }

    let tenantSlug = 'SyncOren';
    let returnTo = '/SyncOren/users';

    if (relayStateParam) {
      try {
        const decoded = JSON.parse(Buffer.from(relayStateParam, 'base64').toString('utf-8'));
        tenantSlug = decoded.tenantSlug || tenantSlug;
        returnTo = decoded.returnTo || returnTo;
      } catch {
        // ברירת מחדל
      }
    }

    // פענוח ה-SAML XML מ-Base64
    const xml = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // חילוץ אימייל, שם וקבוצות מתוך ה-XML
    const emailMatch = xml.match(/(?:name=".*?emailaddress"|name=".*?nameIdentifier"|name=".*?upn")[^>]*>[\s\S]*?<saml\d?:AttributeValue[^>]*>([^<]+)<\/saml\d?:AttributeValue>/i)
      || xml.match(/<saml\d?:NameID[^>]*>([^<]+)<\/saml\d?:NameID>/i);
    const userEmail = emailMatch ? emailMatch[1].trim() : '';

    const nameMatch = xml.match(/(?:name=".*?displayname"|name=".*?name")[^>]*>[\s\S]*?<saml\d?:AttributeValue[^>]*>([^<]+)<\/saml\d?:AttributeValue>/i);
    const userName = nameMatch ? nameMatch[1].trim() : userEmail;

    // חילוץ כל ה-Object IDs של הקבוצות (Groups Claim)
    const groupsMatches = [...xml.matchAll(/name=".*?groups"[^>]*>([\s\S]*?)<\/saml\d?:Attribute>/gi)];
    const extractedGroups: string[] = [];

    for (const match of groupsMatches) {
      const values = [...match[1].matchAll(/<saml\d?:AttributeValue[^>]*>([^<]+)<\/saml\d?:AttributeValue>/gi)];
      values.forEach((v) => extractedGroups.push(v[1].trim()));
    }

    // שליפת הגדרות קבוצות ה-SAML מה-DB לצורך בדיקת הרשאות
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantSlug)
      .single();

    let assignedRole: 'manager' | 'admin' | 'user' = 'user';

    if (settings?.saml_group_managers_id && extractedGroups.includes(settings.saml_group_managers_id)) {
      assignedRole = 'manager';
    } else if (settings?.saml_group_admins_id && extractedGroups.includes(settings.saml_group_admins_id)) {
      assignedRole = 'admin';
    } else if (settings?.saml_group_users_id && extractedGroups.includes(settings.saml_group_users_id)) {
      assignedRole = 'user';
    }

    // יצירת Session מאובטח
    const sessionData = {
      email: userEmail,
      name: userName,
      role: assignedRole,
      tenantId: tenantSlug,
      groups: extractedGroups,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const redirectUrl = new URL(returnTo, req.url);
    const res = NextResponse.redirect(redirectUrl, { status: 303 });
    res.cookies.set('smartq_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: 'שגיאה בעיבוד ה-SAML Callback: ' + err.message }, { status: 500 });
  }
}