'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { ShieldAlert, ArrowRight, LogIn } from 'lucide-react';

export default function AccessDeniedPage() {
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100 mx-auto">
          <Image src="/smartq-logo.png" alt="SmartQ" width={48} height={48} className="object-contain" priority />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900">אין לך הרשאה לגשת לעמוד זה (403)</h1>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            האזור אליו ניסית לגשת בארגון <span className="font-bold text-slate-800">{rawTenant}</span> מוגבל למנהלים או לטכנאי IT בלבד.
          </p>
        </div>

        <div className="pt-2 space-y-2.5">
          <a
            href={`/${rawTenant}/new-request`}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2"
          >
            <span>חזור לפורטל פתיחת קריאות</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </a>

          <a
            href={`/${rawTenant}/login`}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>התחבר עם משתמש אחר</span>
          </a>
        </div>
      </div>
    </div>
  );
}