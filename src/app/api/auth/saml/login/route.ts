import { NextResponse } from 'next/server';
import { SAML } from '@node-saml/node-saml';

const saml = new SAML({
  issuer: 'https://it-ticket-ai-beige.vercel.app',
  callbackUrl: 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback',
  entryPoint: process.env.ENTRA_LOGIN_URL || '',
} as any);

export async function GET() {
  try {
    const loginUrl = await saml.getAuthorizeUrlAsync('', '', {});
    return NextResponse.redirect(loginUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}