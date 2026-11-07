import { NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route } from '@/lib/http';

export const GET = route(async () => {
  let data: unknown = null;
  try {
    data = await db().from('platform_auth_settings')
      .select('saml_enabled, saml_login_url, saml_idp_cert')
      .eq('id', 'default')
      .maybeSingle();
  } catch {
    // The SAML settings table may not exist yet during early bootstrap, or the
    // current deployment predates migration 006. Don't let a missing row abort
    // the platform login flow — just report SAML as unavailable.
  }
  return NextResponse.json({
    samlEnabled: Boolean(data?.saml_enabled && data.saml_login_url && data.saml_idp_cert),
  });
});
