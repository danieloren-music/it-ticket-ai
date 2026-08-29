import { NextResponse } from 'next/server';

export async function GET() {
  const entityId = 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/metadata';
  const acsUrl = 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback';

  const metadataXml = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="1" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

  return new NextResponse(metadataXml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}