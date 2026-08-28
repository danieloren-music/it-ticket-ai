'use client';

import { useState } from 'react';
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
  Send, 
  Sparkles, 
  Accessibility, 
  Eye, 
  Contrast, 
  Link as LinkIcon, 
  RotateCcw,
  Cloud,
  Check,
  Headphones,
  Lock,
  TrendingDown,
  ServerOff
} from 'lucide-react';

export default function SmartQHomePage() {
  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', phone: '', message: '' });
  const [formSent, setFormSent] = useState(false);

  // Accessibility Panel State
  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0); // -1, 0, 1, 2
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);

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
      setContactForm({ name: '', email: '', company: '', phone: '', message: '' });
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
      {/* -------------------- Top Public Header -------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Main Brand & Large Logo */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-md bg-white border border-slate-200/80 flex items-center justify-center shrink-0">
              <Image src="/smartq-logo.png" alt="SmartQ Logo" width={48} height={48} className="object-contain" priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">SmartQ</span>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md uppercase tracking-wide shadow-2xs">
                  AI CORE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold hidden sm:block">
                Next-Gen Enterprise IT Service Management
              </p>
            </div>
          </div>

          {/* Public Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-700">
            <a href="#benefits" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>יתרונות מרכזיים</a>
            <a href="#cloud-saas" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>ענן מנוהל (Zero Ops)</a>
            <a href="#how-it-works" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>איך זה עובד?</a>
            <a href="#contact" className={`hover:text-indigo-600 transition ${highlightLinks ? 'underline font-black text-indigo-700' : ''}`}>יצירת קשר והדגמה</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <span>תיאום הדגמה</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* -------------------- Hero Section -------------------- */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-radial-at-t from-indigo-100/50 via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Brand Mega Chip */}
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-indigo-200/90 text-indigo-800 text-xs sm:text-sm font-black shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>פלטפורמת ה-ITSM מבוססת ה-AI המתקדמת בישראל</span>
          </div>

          {/* Main Massive Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight leading-[1.1] max-w-5xl mx-auto">
            קיצור זמני תגובה ופתרון תקלות IT עם{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              SmartQ
            </span>
          </h1>

          <p className="text-slate-600 font-medium text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed">
            פלטפורמת <strong>SmartQ</strong> מספקת מענה בינה מלאכותית אוטונומי מקצה לקצה עבור קריאות שירות ומחשוב בארגונים. 
            סיווג חכם של תקלות, ניתוב מדויק לצוותים המטפלים ומילוי נתונים אוטומטי תוך שניות – <strong>ללא צורך בהתקנת שרתים או ניהול תשתיות כלל</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="#contact"
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-500/25 transition flex items-center gap-2"
            >
              <span>תיאום הדגמה חיה לארגון</span>
              <ArrowLeft className="w-4 h-4" />
            </a>
            <a
              href="#cloud-saas"
              className="px-8 py-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm rounded-2xl shadow-xs transition"
            >
              למה ענן מנוהל?
            </a>
          </div>

          {/* Key Public Value Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-10 text-right">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <TrendingDown className="w-5 h-5" />
                <span className="text-2xl font-black">70%</span>
              </div>
              <p className="text-xs font-black text-slate-900">קיצור בזמן פתיחת קריאה</p>
              <p className="text-[11px] text-slate-500">שיחה טבעית במקום טפסים ארוכים</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <ServerOff className="w-5 h-5" />
                <span className="text-2xl font-black">0% Ops</span>
              </div>
              <p className="text-xs font-black text-slate-900">אפס תחזוקת תשתיות</p>
              <p className="text-[11px] text-slate-500">הכל מנוהל ומאובטח אצלנו בענן</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <Zap className="w-5 h-5" />
                <span className="text-2xl font-black">זמן אמת</span>
              </div>
              <p className="text-xs font-black text-slate-900">ניתוב וסיווג אוטונומי</p>
              <p className="text-[11px] text-slate-500">שיוך ישיר לצוות ה-IT המתאים</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-2xl font-black">Enterprise</span>
              </div>
              <p className="text-xs font-black text-slate-900">חיבור SSO ארגוני</p>
              <p className="text-[11px] text-slate-500">תמיכה ב-Microsoft Entra ID</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Cloud SaaS Zero-Maintenance Section -------------------- */}
      <section id="cloud-saas" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">100% Fully Managed SaaS</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">אתם מתמקדים בפתרון תקלות, אנחנו דואגים לכל השאר</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-xs sm:text-sm font-medium">
              הארגון מקבל סביבת עבודה ייעודית, מהירה ומבודדת תוך דקות – בלי צורך בהתקנת שרתים, מסדי נתונים או תחזוקת גרסאות.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-950">ענן מנוהל ללא כאבי ראש</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                אין צורך בהקצאת שרתי On-Premise, רישיונות DB או ניהול נפחי אחסון. המערכת מנוהלת ומנוטרת 24/7 בענן המאובטח של SmartQ.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-950">בינה מלאכותית מקצה לקצה</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                מנוע AI מתקדם שמנתח את התיאור של העובד, מזהה רכיבי חומרה ותוכנה שנפגעו, קובע דחיפות SLA ומייצר קריאה מסודרת באופן מיידי.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 space-y-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-950">אבטחת מידע ובידוד ארגוני</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                כל ארגון נהנה מבידוד נתונים מוחלט, אימות זהויות מאובטח (SAML 2.0 / Entra ID) והצפנה ברמה המחמירה ביותר.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- How It Works -------------------- */}
      <section id="how-it-works" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Simple & Fast Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">איך SmartQ עובדת בארגון שלך?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm">
                1
              </div>
              <h4 className="font-black text-slate-950 text-sm">העובד מתאר את התקלה בשיחה</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                העובד כותב בשפה חופשית וטבעית ("נשפך לי מים על המקלדת", "איטיות ב-VPN").
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-sm">
                2
              </div>
              <h4 className="font-black text-slate-950 text-sm">מנוע ה-AI מסווג ומנתח</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                SmartQ מנתחת את מהות התקלה, קובעת רמת דחיפות ומשייכת אוטומטית לצוות הרלוונטי.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                3
              </div>
              <h4 className="font-black text-slate-950 text-sm">הקריאה מגיעה מוכנה לטכנאי</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                צוות ה-IT מקבל קריאה ברורה ומסווגת עם כל הפרטים וניגש ישירות לפתרון התקלה.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Contact & Demo Section -------------------- */}
      <section id="contact" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Schedule a Demo</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">מוכנים לשדרג את מערך ה-IT בארגון?</h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              השאירו פרטים ונשמח להציג לכם הדגמה חיה ולהקים סביבת ניסיון מותאמת לארגונכם.
            </p>
          </div>

          <div className="bg-[#F8FAFC] p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
            {formSent ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-black text-slate-950">פנייתך התקבלה בהצלחה!</h3>
                <p className="text-xs text-slate-600">צוות SmartQ יחזור אליך בהקדם לתיאום הדגמה חיה.</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <label className="block font-bold mb-1.5 text-slate-800">טלפון ליצירת קשר</label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="050-0000000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 text-slate-800">הודעה או צרכים מיוחדים</label>
                  <textarea
                    rows={3}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="ספר לנו על כמות המשתמשים בארגון וצרכי ה-IT..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>שליחת פנייה לצוות SmartQ</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* -------------------- Public Footer -------------------- */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-white flex items-center justify-center">
              <Image src="/smartq-logo.png" alt="SmartQ" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-white font-black text-sm">SmartQ Enterprise Platform</span>
          </div>

          <p className="text-slate-400 font-medium">
            כל הזכויות שמורות © {new Date().getFullYear()} SmartQ. נבנה עבור ארגונים וחברות מובילות בישראל.
          </p>
        </div>
      </footer>

      {/* -------------------- Accessibility Widget -------------------- */}
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