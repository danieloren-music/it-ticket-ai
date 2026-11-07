import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { route } from '@/lib/http';
import type { SamlSettings } from '@/lib/saml';

/**
 * SAML is optional for Platform login. If its settings are unavailable (for
 * example, before the SAML migration or service-role configuration is added),
 * the password login page must still load normally.
 */
export const GET = route(async () => {
  try {
    const { data, error } = await db()
      .from('platform_auth_settings')
      .select('saml_enabled, saml_login_url, saml_idp_cert')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.warn('[platform-saml] Could not read optional SAML settings:', error.message);
      return NextResponse.json({ samlEnabled: false });
    }

    const settings = data as SamlSettings | null;
    return NextResponse.json({
      samlEnabled: Boolean(
        settings?.saml_enabled &&
        settings.saml_login_url &&
        settings.saml_idp_cert
      ),
    });
  } catch (error) {
    // Do not turn an optional SAML-settings failure into a broken login page.
    console.warn(
      '[platform-saml] SAML status unavailable; using password login:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ samlEnabled: false });
  }
});
