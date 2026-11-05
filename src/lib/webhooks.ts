import 'server-only';
import { createHmac } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request, type RequestOptions } from 'node:https';

interface ResolvedAddress {
  address: string;
  family: number;
}

function isPublicAddress(address: string, family: number): boolean {
  if (family === 4) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const [a, b, c] = parts;
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (family !== 6) return false;
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:') || normalized === '::1' || normalized === '::') return false;
  const first = Number.parseInt(normalized.split(':')[0] || '0', 16);
  return first >= 0x2000 && first <= 0x3fff && normalized !== '2001:db8::';
}

export function validateWebhookUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Webhook URL must be a valid HTTPS URL'); }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    isIP(url.hostname) ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    url.hostname.endsWith('.local') ||
    url.hostname.endsWith('.internal')
  ) {
    throw new Error('Webhook URL must use a public HTTPS hostname without credentials or a fragment');
  }
  return url;
}

export async function postWebhook(urlValue: string, payload: Record<string, unknown>, secret: string): Promise<void> {
  const url = validateWebhookUrl(urlValue);
  const addresses = await dnsLookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((record) => !isPublicAddress(record.address, record.family))) {
    throw new Error('Webhook hostname did not resolve exclusively to public IP addresses');
  }
  const pinnedAddresses: ResolvedAddress[] = addresses.map((record) => ({ address: record.address, family: record.family }));
  const lookup: NonNullable<RequestOptions['lookup']> = (_hostname, options, callback) => {
    if ('all' in options && options.all) {
      callback(null, pinnedAddresses);
      return;
    }
    callback(null, pinnedAddresses[0].address, pinnedAddresses[0].family);
  };
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  await new Promise<void>((resolve, reject) => {
    const req = request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        'x-smartq-signature': `sha256=${signature}`,
        'x-smartq-event': String(payload.event ?? 'smartq.event'),
      },
      lookup,
      timeout: 5000,
    }, (res) => {
      res.resume();
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Webhook returned HTTP ${res.statusCode ?? 'unknown'}`));
      });
    });
    req.on('timeout', () => req.destroy(new Error('Webhook request timed out')));
    req.on('error', reject);
    req.end(body);
  });
}
