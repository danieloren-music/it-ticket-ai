'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { Brand, btnPrimary } from '@/components/ui';

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4 text-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Brand size={34} /></div>
        <div className="rounded-2xl border border-line bg-white p-8">
          <p className="text-4xl font-bold text-brand tnum">404</p>
          <h1 className="mt-3 text-xl font-bold">{t('העמוד או הארגון לא נמצאו', 'Page or organization not found')}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t('הכתובת שגויה, או שהארגון טרם הוקם או הושעה.', 'The address is wrong, or the organization has not been set up or was suspended.')}</p>
          <Link href="/home" className={`${btnPrimary} mt-6 w-full`}>{t('לאתר הראשי', 'Back to the main site')}</Link>
        </div>
      </div>
    </div>
  );
}
