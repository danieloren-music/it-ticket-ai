import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'SmartQ – IT service desk';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const logoData = await readFile(join(process.cwd(), 'public', 'smartq-brand-mark.png'), 'base64');
const logoSrc = `data:image/png;base64,${logoData}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0b1430', color: '#fff', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff', backgroundImage: `url(${logoSrc})`, backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: '54px 54px', marginRight: 16 }} />
          SmartQ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>IT support,</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: '#8fa0ff' }}>made easier.</div>
          <div style={{ fontSize: 30, color: '#b6c0e6', marginTop: 28 }}>Describe the issue. SmartQ helps route it to the right team.</div>
        </div>
        <div style={{ fontSize: 26, color: '#8a96c4' }}>smartq-ai.com</div>
      </div>
    ),
    size
  );
}
