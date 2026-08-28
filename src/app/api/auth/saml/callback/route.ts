import { NextRequest, NextResponse } from 'next/server';
import { SAML } from '@node-saml/node-saml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatCert(cert: string) {
  if (!cert) return '';
  const clean = cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  return `-----BEGIN CERTIFICATE-----\n${clean}\n-----END CERTIFICATE-----`;
}

export async function POST(req: NextRequest) {
  try {
    const rawCert = process.env.ENTRA_CERTIFICATE || '';
    const entryPoint = process.env.ENTRA_LOGIN_URL || '';

    const saml = new SAML({
      issuer: 'https://it-ticket-ai-beige.vercel.app',
      callbackUrl: 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback',
      entryPoint: entryPoint,
      idpCert: formatCert(rawCert),
      wantAssertionsSigned: true,
    } as any);

    const formData = await req.formData();
    const SAMLResponse = formData.get('SAMLResponse') as string;

    const result = await saml.validatePostResponseAsync({ SAMLResponse });
    const profile: any = result?.profile;

    const userName = (profile?.displayName || profile?.name || profile?.['http://schemas.microsoft.com/identity/claims/displayname'] || 'User') as string;
    const userEmail = (profile?.email || profile?.nameID || profile?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '') as string;
    const userDept = (profile?.department || 'IT Operations') as string;

    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('name', userName);
    redirectUrl.searchParams.set('email', userEmail);
    redirectUrl.searchParams.set('dept', userDept);

    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error('SAML Callback Error:', err);
    return NextResponse.json({ error: 'SAML Authentication failed', details: err.message }, { status: 500 });
  }
}