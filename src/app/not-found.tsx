import Image from 'next/image';
import Link from 'next/link';
import { Building2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-950">הארגון לא נמצא במערכת</h1>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            כתובת הסביבה שניסית לגשת אליה אינה קיימת, הושעתה או שטרם הוקמה על ידי מנהל הפלטפורמה.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/home"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <span>חזרה לאתר הראשי</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}