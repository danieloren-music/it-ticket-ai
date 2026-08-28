'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Building2, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  Phone, 
  Mail, 
  Send, 
  Sparkles, 
  Accessibility, 
  Eye, 
  Type, 
  Contrast, 
  Link as LinkIcon, 
  RotateCcw,
  Bot,
  Lock,
  BarChart3,
  Server
} from 'lucide-react';

export default function SmartQHomePage() {
  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', message: '' });
  const [formSent, setFormSent] = useState(false);

  // Accessibility Panel State
  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0); // -1, 0, 1, 2
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);

  // Accessibility Font size classes
  const getFontSizeClass = () => {
    if (fontSizeLevel === 1) return 'text-[1.08rem]';
    if (fontSizeLevel === 2) return 'text-[1.18rem]';
    if (fontSizeLevel === -1) return 'text-[0.92rem]';
    return 'text-base';
  };

  const resetA11y = () => {
    setFontSizeLevel(0);
    setIsHighContrast(false);
    setIsGrayscale(false);
    setHighlightLinks(false);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    setTimeout(() => {
      setContactForm({ name: '', email: '', company: '', message: '' });
      setFormSent(false);
    }, 4000);
  };

  return (
    <div 
      dir="rtl" 
      className={`min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white transition-all duration-300 ${getFontSizeClass()} ${
        isHighContrast ? 'contrast-150 bg-black text-yellow-300' : ''
      } ${isGrayscale ? 'grayscale' : ''}`}
    >
      {/* -------------------- Top Navigation Bar -------------------- */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md bg-white border border-slate-100 flex items-center justify-center">
              <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-950">SmartQ</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md uppercase">
                ENTERPRISE
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-700">
            <a href="#features" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>יתרונות המערכת</a>
            <a href="#architecture" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>ארכיטקטורה</a>
            <a href="#ai-engine" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>Zack AI Copilot</a>
            <a href="#contact" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>יצירת קשר והדגמה</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/platform"
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5"
            >
              <span>קונסולת ניהול</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* -------------------- Hero Section -------------------- */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-radial-at-t from-indigo-50/50 via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-bold shadow-2xs animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>הדור הבא של מערכות IT Service Management בישראל</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            ניהול קריאות שירות IT בארגונים עם{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              בינה מלאכותית אוטונומית
            </span>
          </h1>

          <p className="text-slate-600 font-medium text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            פלטפורמת <strong>SmartQ</strong> משלבת את <strong>Zack AI Copilot</strong> לסיווג אוטומטי, ניתוח דחיפות SLA ותיעוד מהיר של תקלות מחשוב ותשתיות – בלי טפסים מסורבלים ובאבטחת Enterprise מלאה.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="#contact"
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-2"
            >
              <span>תיאום הדגמה חיה (Live Demo)</span>
              <ArrowLeft className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm rounded-xl shadow-xs transition"
            >
              למד עוד על היכולות
            </a>
          </div>

          {/* Metrics Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-12 text-right">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-3xl font-black text-indigo-600">84%</span>
              <p className="text-xs font-bold text-slate-800 mt-1">הסטת פניות וסיווג אוטומטי</p>
              <p className="text-[11px] text-slate-500">ללא צורך במיון ידני ב-Helpdesk</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-3xl font-black text-purple-600">&lt; 2 שניות</span>
              <p className="text-xs font-bold text-slate-800 mt-1">זמן יצירת קריאה מלאה</p>
              <p className="text-[11px] text-slate-500">משיחה טבעית לטופס מובנה</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-3xl font-black text-emerald-600">100%</span>
              <p className="text-xs font-bold text-slate-800 mt-1">בידוד נתונים מוחלט</p>
              <p className="text-[11px] text-slate-500">ארכיטקטורת Multi-Tenant מוגנת</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-3xl font-black text-orange-600">SAML 2.0</span>
              <p className="text-xs font-bold text-slate-800 mt-1">התחברות Entra ID ארגונית</p>
              <p className="text-[11px] text-slate-500">חיבור מאובטח ל-Active Directory</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Features Section -------------------- */}
      <section id="features" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Enterprise Feature Set</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">כל מה שמחלקת IT מתקדמת צריכה</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-xs sm:text-sm font-medium">
              פלטפורמה אחודה המספקת מענה מלא לעובדי הקצה, לטכנאי השטח ולמנהלי התשתיות והמערכות.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-950">Zack AI Service Agent</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                שיחה טבעית ומהירה בעברית. Zack מזהה את התקלה, חומרה או תוכנה שנפגעו, דחיפות ה-SLA ומשייך ישירות לצוות המטפל המתאים.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-950">3-Tier RBAC Architecture</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                הפרדה הרמטית בין פורטל עובדי קצה (<code className="font-mono text-indigo-600 font-bold">/users</code>), תור טכנאים (<code className="font-mono text-indigo-600 font-bold">/admins</code>), וקונסולת ניהול ארגונית (<code className="font-mono text-indigo-600 font-bold">/manage</code>).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-950">אינטגרציית SSO & SAML 2.0</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                חיבור מהיר ומאובטח ל-Microsoft Entra ID, Okta או Google Workspace עם תמיכה בהעברת זהויות ומשתמשים אוטומטית.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-950">ניהול מדיניות SLA דינמית</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                קביעת זמני יעד לטיפול בתקלות לפי רמות דחיפות מותאמות אישית לכל ארגון והתרעות חריגה בזמן אמת.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-950">מפתחות API ואינטגרציות Webhooks</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                מחולל מפתחות API לחיבור מערכות חיצוניות (ServiceNow, Jira, ERP) והתרעות ישירות ל-Microsoft Teams ול-Slack.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-950">אנליטיקה ודשבורד מנהלים</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                מעקב ביצועים בזמן אמת, אחוזי הצלחה, חלוקת עומסים לפי צוותים מטפלים וזמני מענה ממוצעים.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Architecture Section -------------------- */}
      <section id="architecture" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Multi-Tenant Cloud Ready</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">מבנה סביבות עבודה לכל לקוח</h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium max-w-xl mx-auto">
              כל ארגון מקבל מרחב מבודד לחלוטין עם ניתוב נתונים ייעודי.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                /[tenant]/users
              </span>
              <h4 className="font-black text-slate-900 text-sm mt-2">פורטל עובדים</h4>
              <p className="text-slate-500">שיחה מול Zack AI ושיגור קריאה בשניות.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                /[tenant]/admins
              </span>
              <h4 className="font-black text-slate-900 text-sm mt-2">תור טכנאי IT</h4>
              <p className="text-slate-500">ניהול, לקיחה לטיפול וסגירת קריאות שירות.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                /[tenant]/manage
              </span>
              <h4 className="font-black text-slate-900 text-sm mt-2">קונסולת ניהול ארגון</h4>
              <p className="text-slate-500">הגדרות צוותים, SLA, ידע והנחיות ל-Zack AI.</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Contact & Demo Section -------------------- */}
      <section id="contact" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Get in Touch</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">מעוניין ב-SmartQ לארגון שלך?</h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              השאר פרטים ונציג טכנולוגי ייצור עמך קשר להקמת סביבת POC מותאמת.
            </p>
          </div>

          <div className="bg-[#F8FAFC] p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            {formSent ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-black text-slate-950">הפנייה נשלחה בהצלחה!</h3>
                <p className="text-xs text-slate-600">צוות SmartQ יחזור אליך בהקדם לתיאום הדגמה.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1.5 text-slate-800">שם מלא *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="ישראל ישראלי"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1.5 text-slate-800">אימייל ארגוני *</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 text-slate-800">שם הארגון / חברה *</label>
                  <input
                    type="text"
                    required
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    placeholder="שם החברה שלך"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5 text-slate-800">הודעה או דגשים מיוחדים</label>
                  <textarea
                    rows={3}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="ספר לנו על כמות המשתמשים וצרכי ה-IT בארגון..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>שלח פנייה לצוות SmartQ</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* -------------------- Footer -------------------- */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <Image src="/smartq-logo.png" alt="SmartQ" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-white font-black text-sm">SmartQ Enterprise ITSM</span>
          </div>

          <p className="text-slate-400 font-medium">
            כל הזכויות שמורות © {new Date().getFullYear()} SmartQ. נבנה עבור ארגונים מתקדמים בישראל.
          </p>
        </div>
      </footer>

      {/* -------------------- Accessibility Widget (תקן נגישות ישראלי) -------------------- */}
      <div className="fixed bottom-6 left-6 z-50">
        {!isA11yOpen ? (
          <button
            onClick={() => setIsA11yOpen(true)}
            className="p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl border-2 border-white transition flex items-center justify-center"
            title="פתח תפריט נגישות (Accessibility)"
            aria-label="הצהרת ותפריט נגישות"
          >
            <Accessibility className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-80 bg-white border border-slate-300 rounded-3xl shadow-2xl p-5 space-y-4 text-xs text-slate-900 font-sans">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200">
              <div className="flex items-center gap-2 font-black text-indigo-700">
                <Accessibility className="w-5 h-5" />
                <span>תפריט נגישות ע״פ חוק</span>
              </div>
              <button
                onClick={() => setIsA11yOpen(false)}
                className="text-slate-400 hover:text-slate-800 font-black text-sm px-1.5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-600">גודל טקסט באתר:</p>
              <div className="grid grid-cols-3 gap-1.5 font-bold">
                <button
                  onClick={() => setFontSizeLevel(-1)}
                  className={`p-2 rounded-xl border ${fontSizeLevel === -1 ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  A- הקטן
                </button>
                <button
                  onClick={() => setFontSizeLevel(0)}
                  className={`p-2 rounded-xl border ${fontSizeLevel === 0 ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  רגיל
                </button>
                <button
                  onClick={() => setFontSizeLevel(1)}
                  className={`p-2 rounded-xl border ${fontSizeLevel === 1 ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  A+ הגדל
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 font-bold">
              <button
                onClick={() => setIsHighContrast(!isHighContrast)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  isHighContrast ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Contrast className="w-4 h-4" />
                  <span>ניגודיות צבעים גבוהה</span>
                </div>
                <span>{isHighContrast ? 'פעיל' : 'כבוי'}</span>
              </button>

              <button
                onClick={() => setIsGrayscale(!isGrayscale)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  isGrayscale ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>גווני אפור (מונוכרום)</span>
                </div>
                <span>{isGrayscale ? 'פעיל' : 'כבוי'}</span>
              </button>

              <button
                onClick={() => setHighlightLinks(!highlightLinks)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  highlightLinks ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>הדגשת קישורים</span>
                </div>
                <span>{highlightLinks ? 'פעיל' : 'כבוי'}</span>
              </button>
            </div>

            <button
              onClick={resetA11y}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>איפוס התאמות נגישות</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}