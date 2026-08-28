import { NextRequest, NextResponse } from 'next/server';
import { SAML } from '@node-saml/node-saml';

const saml = new SAML({
  issuer: 'https://it-ticket-ai-beige.vercel.app',
  callbackUrl: 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback',
  idpCert: process.env.ENTRA_CERTIFICATE!,
  wantAssertionsSigned: true,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const SAMLResponse = formData.get('SAMLResponse') as string;

    const { profile } = await saml.validatePostResponseAsync({ SAMLResponse });

    const userName = (profile?.displayName || profile?.name || 'User') as string;
    const userEmail = (profile?.email || profile?.nameID || '') as string;
    const userDept = ((profile as any)?.department || 'IT Operations') as string;

    // הפניה חזרה לדף הראשי עם פרטי המשתמש שחולצו
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('name', userName);
    redirectUrl.searchParams.set('email', userEmail);
    redirectUrl.searchParams.set('dept', userDept);

    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error('SAML Error:', err);
    return NextResponse.json({ error: 'SAML Authentication failed', details: err.message }, { status: 500 });
  }
}