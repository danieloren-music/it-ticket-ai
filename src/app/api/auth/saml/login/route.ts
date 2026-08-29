import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get('tenant') || 'SyncOren';
  const returnTo = searchParams.get('returnTo') || `/${tenantSlug}/users`;

  // שליפת הגדרות ה-SAML של ה-Tenant
  const [tenantRes, settingsRes] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantSlug).single(),
    supabase.from('tenant_settings').select('*').eq('tenant_id', tenantSlug).single()
  ]);

  const samlLoginUrl = settingsRes.data?.saml_login_url || tenantRes.data?.saml_login_url;

  if (!samlLoginUrl) {
    return NextResponse.json(
      { error: `טרם הוגדרה כתובת SAML Login URL עבור ${tenantSlug}. הגדר אותה ב-/${tenantSlug}/manage` },
      { status: 400 }
    );
  }

  const relayState = Buffer.from(JSON.stringify({ tenantSlug, returnTo })).toString('base64');

  // הפניה ל-Entra ID SAML Single Sign-On
  const redirectUrl = new URL(samlLoginUrl);
  redirectUrl.searchParams.set('RelayState', relayState);

  return NextResponse.redirect(redirectUrl.toString());
}