'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { Brand, btnPrimary, btnSecondary } from '@/components/ui';

export default function AccessDeniedPage() {
  const { t } = useLang();
  const tenant = String(useParams().tenant ?? '');
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center"><Brand size={34} /></div>
        <div className="rounded-2xl border border-line bg-white p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" aria-hidden />
          <h1 className="mt-4 text-xl font-bold">{t('אין לכם הרשאה לעמוד זה', 'You do not have access to this page')}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t('העמוד שביקשתם שמור לטכנאי IT או למנהלי מערכת.', 'This page is reserved for IT technicians or administrators.')}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href={`/${tenant}`} className={btnPrimary}>{t('חזרה לאזור שלי', 'Back to my area')}</Link>
            <Link href={`/${tenant}/login`} className={btnSecondary}>{t('כניסה עם משתמש אחר', 'Sign in as someone else')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
