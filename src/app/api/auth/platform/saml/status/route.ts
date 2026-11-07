import { NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route } from '@/lib/http';

export const GET = route(async () => {
  const data = must(await db().from('platform_auth_settings')
    .select('saml_enabled, saml_login_url, saml_idp_cert')
    .eq('id', 'default')
    .maybeSingle());
  return NextResponse.json({
    samlEnabled: Boolean(data?.saml_enabled && data.saml_login_url && data.saml_idp_cert),
  });
});
