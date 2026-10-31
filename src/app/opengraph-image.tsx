import { ImageResponse } from 'next/og';

export const alt = 'SmartQ – AI service desk';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0b1430', color: '#fff', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2f45d6', marginRight: 16 }} />
          SmartQ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>From “my Wi-Fi is down”</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: '#8fa0ff' }}>to a routed ticket.</div>
          <div style={{ fontSize: 30, color: '#b6c0e6', marginTop: 28 }}>AI service desk · multi-tenant · SAML SSO · try it live</div>
        </div>
        <div style={{ fontSize: 26, color: '#8a96c4' }}>smartq-ai.vercel.app</div>
      </div>
    ),
    size
  );
}
