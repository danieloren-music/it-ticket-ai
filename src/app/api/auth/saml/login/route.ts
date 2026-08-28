import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const rawCert = process.env.ENTRA_CERTIFICATE || '';
    const entryPoint = process.env.ENTRA_LOGIN_URL || '';

    if (!entryPoint) {
      return NextResponse.json({ error: 'ENTRA_LOGIN_URL is missing' }, { status: 500 });
    }

    const saml = new SAML({
      issuer: 'https://it-ticket-ai-beige.vercel.app',
      callbackUrl: 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback',
      entryPoint: entryPoint,
      idpCert: formatCert(rawCert),
    } as any);

    const loginUrl = await saml.getAuthorizeUrlAsync('', '', {});
    return NextResponse.redirect(loginUrl);
  } catch (err: any) {
    console.error('SAML Login Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}