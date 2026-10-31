import type { Metadata, Viewport } from 'next';
import { Heebo, Geist_Mono } from 'next/font/google';
import { LangProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui';
import './globals.css';

const heebo = Heebo({ variable: '--font-heebo', subsets: ['hebrew', 'latin'], display: 'swap' });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const site = process.env.NEXT_PUBLIC_APP_URL || 'https://smartq-ai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'SmartQ – AI service desk', template: '%s · SmartQ' },
  description: 'SmartQ turns a free-text IT problem into a classified, prioritized and routed ticket. Multi-tenant, SAML SSO, role-based access.',
  openGraph: {
    type: 'website',
    siteName: 'SmartQ',
    title: 'SmartQ – AI service desk',
    description: 'Describe the problem in plain language. SmartQ classifies, prioritizes and routes the ticket. Try it live.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#2f45d6', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <LangProvider>
          <ToastProvider>{children}</ToastProvider>
        </LangProvider>
      </body>
    </html>
  );
}
