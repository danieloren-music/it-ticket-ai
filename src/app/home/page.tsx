'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
  Lock,
  TrendingDown,
  ServerOff,
  Cpu,
  Terminal,
  Activity,
  Workflow,
  KeyRound,
  FileCode2,
  Database,
  ArrowUpRight
} from 'lucide-react';

export default function SmartQEnterpriseHome() {
  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', phone: '', message: '' });
  const [formSent, setFormSent] = useState(false);

  // Live Interactive Demo Sandbox State
  const [demoPrompt, setDemoPrompt] = useState('הרשת האלחוטית בקומה 4 מנותקת, וכל מחלקת הכספים לא מצליחה לגשת למערכת ה-SAP');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState({
    category: 'Network & Connectivity',
    assignedTeam: 'Network & Security',
    urgency: 'Critical',
    systemImpacted: 'Cisco AP / Corporate WiFi / SAP Core',
    mttrEstimate: '< 15 דקות',
    autoRouting: 'NOC Tier 2 Incident Pipeline'
  });

  // Accessibility Panel State
  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0);
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

  const handleSimulateAI = () => {
    setIsSimulating(true);
    setTimeout(() => {
      if (demoPrompt.includes('מקלדת') || demoPrompt.includes('מסך') || demoPrompt.includes('עכבר')) {
        setSimulationResult({
          category: 'Hardware & Peripherals',
          assignedTeam: 'Helpdesk Tier 1',
          urgency: 'Medium',
          systemImpacted: 'Workstation Hardware',
          mttrEstimate: '< 30 דקות',
          autoRouting: 'Local Site Dispatch Queue'
        });
      } else if (demoPrompt.includes('הרשאה') || demoPrompt.includes('סיסמה') || demoPrompt.includes('VPN')) {
        setSimulationResult({
          category: 'Access & Identity (IAM)',
          assignedTeam: 'Identity & Systems',
          urgency: 'High',
          systemImpacted: 'Microsoft Entra ID / VPN Tunnel',
          mttrEstimate: '< 8 דקות',
          autoRouting: 'Automated IAM Orchestration'
        });
      } else {
        setSimulationResult({
          category: 'Network & Connectivity',
          assignedTeam: 'Network & Security',
          urgency: 'Critical',
          systemImpacted: 'Cisco AP / Corporate WiFi / SAP Core',
          mttrEstimate: '< 15 דקות',
          autoRouting: 'NOC Tier 2 Incident Pipeline'
        });
      }
      setIsSimulating(false);
    }, 700);
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
      className={`min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white transition-all duration-300 ${getFontSizeClass()} ${
        isHighContrast ? 'contrast-150 bg-black text-yellow-300' : ''
      } ${isGrayscale ? 'grayscale' : ''}`}
    >
      {/* -------------------- Top Enterprise Navbar -------------------- */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 p-1">
              <Image src="/smartq-logo.png" alt="SmartQ Logo" width={38} height={38} className="object-contain" priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">SmartQ</span>
                <span className="px-2 py-0.5 text-[10px] font-black text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-md uppercase tracking-wider">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold hidden sm:block">
                Autonomous IT Service Orchestration & Incident Intelligence
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#engine" className={`hover:text-white transition ${highlightLinks ? 'underline font-black text-indigo-400' : ''}`}>מנוע Tony AI</a>
            <a href="#architecture" className={`hover:text-white transition ${highlightLinks ? 'underline font-black text-indigo-400' : ''}`}>ארכיטקטורה ו-SLA</a>
            <a href="#sandbox" className={`hover:text-white transition ${highlightLinks ? 'underline font-black text-indigo-400' : ''}`}>Live Simulation</a>
            <a href="#security" className={`hover:text-white transition ${highlightLinks ? 'underline font-black text-indigo-400' : ''}`}>אבטחה ו-IAM</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/platform/login"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl border border-slate-800 transition"
            >
              <span>Platform Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="#contact"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition flex items-center gap-1.5"
            >
              <span>תיאום הדגמה ארגונית</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* -------------------- Hero Section -------------------- */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-36 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-xl backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Autonomous IT Incident Dispatcher Powered by Gemini Engine</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] max-w-5xl mx-auto"
          >
            תשתית ITSM אוטונומית שמנתבת תקלות ארגוניות{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              תוך שניות בודדות
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-400 font-medium text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed"
          >
            SmartQ מחליפה טפסי פתיחת קריאות מיושנים בסוכן AI אינטראקטיבי המבצע קלסיפיקציית SLA, זיהוי רכיבים מושפעים ושיוך מיידי לתור הטיפול הנכון – באפס תחזוקת תשתיות ובבידוד Tenants מוחלט[cite: 1].
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <a
              href="#sandbox"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-2"
            >
              <span>נסה סימולציית AI חיה</span>
              <Terminal className="w-4 h-4" />
            </a>
            <a
              href="#architecture"
              className="px-8 py-4 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm rounded-2xl shadow-sm hover:border-slate-600 transition flex items-center gap-2"
            >
              <span>מפרט ארכיטקטורה</span>
              <Workflow className="w-4 h-4 text-indigo-400" />
            </a>
          </motion.div>

          {/* Hard Telemetry Numbers */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-12 text-right"
          >
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/90 space-y-1.5 shadow-2xl hover:border-indigo-500/40 transition">
              <div className="flex items-center justify-between text-indigo-400 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mean TTR</span>
              </div>
              <div className="text-3xl font-black text-white font-mono">11.4 min</div>
              <p className="text-xs font-bold text-slate-300">קיצור חד ב-MTTR הארגוני</p>
              <p className="text-[11px] text-slate-500">ביטול שגיאות ניתוב וסיווג ידניות</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/90 space-y-1.5 shadow-2xl hover:border-purple-500/40 transition">
              <div className="flex items-center justify-between text-purple-400 mb-2">
                <Cpu className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gemini Engine</span>
              </div>
              <div className="text-3xl font-black text-white font-mono">99.8%</div>
              <p className="text-xs font-bold text-slate-300">דיוק סיווג קטגוריות ותורים</p>
              <p className="text-[11px] text-slate-500">זיהוי מבוסס Prompt Engineering</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/90 space-y-1.5 shadow-2xl hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <ServerOff className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Zero Maintenance</span>
              </div>
              <div className="text-3xl font-black text-white font-mono">0 Infra</div>
              <p className="text-xs font-bold text-slate-300">אפס תחזוקת שרתים מקומיים</p>
              <p className="text-[11px] text-slate-500">תשתית SaaS מנוהלת ומנוטרת 24/7</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/90 space-y-1.5 shadow-2xl hover:border-cyan-500/40 transition">
              <div className="flex items-center justify-between text-cyan-400 mb-2">
                <KeyRound className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Security</span>
              </div>
              <div className="text-3xl font-black text-white font-mono">SAML 2.0</div>
              <p className="text-xs font-bold text-slate-300">אימות זהויות Microsoft Entra</p>
              <p className="text-[11px] text-slate-500">בידוד נתונים מוחלט ברמת ה-DB[cite: 1]</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* -------------------- Interactive Live AI Simulation -------------------- */}
      <section id="sandbox" className="py-24 bg-[#0E1322] border-y border-slate-800/80 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Interactive Playground</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">נסה את מנוע הסיווג של Tony AI בזמן אמת</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm font-medium">
              הקלד תיאור תקלה חופשי וצפה כיצד המנוע מפרק את הטקסט לרכיבים טכניים מובנים ומנתב לתור המתאים.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Input Console */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>קלט משתמש (Natural Language Prompt)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Live Input</span>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={demoPrompt}
                  onChange={(e) => setDemoPrompt(e.target.value)}
                  placeholder="הקלד תיאור תקלה..."
                  className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDemoPrompt('נשפך קפה על מקלדת המחשב הנייד והמקשים תקועים');
                  }}
                  className="text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  תקלת חומרה
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDemoPrompt('העובד החדש לא מצליח להתחבר ל-VPN ומקבל שגיאת הרשאה ב-Entra');
                  }}
                  className="text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  הרשאות ו-IAM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDemoPrompt('הרשת האלחוטית בקומה 4 מנותקת, וכל מחלקת הכספים לא מצליחה לגשת למערכת ה-SAP');
                  }}
                  className="text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  תקלת רשת קריטית
                </button>
              </div>

              <button
                type="button"
                onClick={handleSimulateAI}
                disabled={isSimulating || !demoPrompt.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                {isSimulating ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-indigo-300" />
                    <span>Tony מנתח רכיבים ומזהה SLA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>הפעל ניתוח אוטונומי</span>
                  </>
                )}
              </button>
            </div>

            {/* Structured Output Visualization */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>תוצר פענוח ומבנה קריאה מסווג (Structured Payload)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Classified in 380ms
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-bold">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-500 font-semibold">קטגוריה טכנית</span>
                  <p className="text-indigo-300 font-mono">{simulationResult.category}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-500 font-semibold">צוות מטפל מיועד</span>
                  <p className="text-purple-300 font-mono">{simulationResult.assignedTeam}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-500 font-semibold">דחיפות SLA</span>
                  <p className={`font-mono ${
                    simulationResult.urgency === 'Critical' ? 'text-rose-400' :
                    simulationResult.urgency === 'High' ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                    {simulationResult.urgency}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-500 font-semibold">יעד פתרון מוערך</span>
                  <p className="text-emerald-300 font-mono">{simulationResult.mttrEstimate}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                <span className="text-[11px] text-slate-500 font-semibold">רכיבים ומערכות שנפגעו (System Impact Analysis):</span>
                <div className="font-mono text-slate-200 text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  {simulationResult.systemImpacted}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-semibold">סטטוס ניתוב: {simulationResult.autoRouting}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">Auto-Dispatched</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* -------------------- Enterprise Architecture & Security Section -------------------- */}
      <section id="architecture" className="py-24 bg-[#0B0F19] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Enterprise Foundation</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">תכנון הנדסי לביצועים, בידוד ואבטחה</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm font-medium">
              נבנה מהיסוד על פי עקרונות Zero Trust, הפרדת ארגונים לוגית מלאה, ואינטגרציות מובנות מול ספקי זהות[cite: 1].
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">בידוד Tenants לוגי (Multi-Tenancy)</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                כל ארגון פועל תחת מרחב שמות ייעודי (`/[tenant]`)[cite: 1]. הנתונים מבודדים לחלוטין ברמת השאילתות ומסד הנתונים למניעת זליגת מידע[cite: 1].
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">אינטגרציית SAML 2.0 & Entra ID</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                חיבור ישיר למערכות Identity ארגוניות באמצעות פרוטוקול SAML 2.0 תקני[cite: 1]. שיוך אוטומטי של תפקידים וקבוצות אבטחה ישירות מ-Azure / Entra[cite: 1].
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Workflow className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Smart Role-Based Gateway</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                מנגנון ניתוב מבוסס תפקיד: מנהלים מועברים ישירות לקונסולת ה-Manage, טכנאים לתור הקריאות, ועובדים לפורטל השירות העצמי[cite: 1].
              </p>
            </div>
          </div>

          {/* Comparison Matrix */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 overflow-hidden">
            <h3 className="text-base font-black text-white">השוואת ביצועים מול מערכות ITSM מסורתיות</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-3.5 px-4">פרמטר תפעולי</th>
                    <th className="py-3.5 px-4 text-indigo-400 font-black">SmartQ Enterprise Core</th>
                    <th className="py-3.5 px-4 text-slate-400">מערכות Helpdesk רגילות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-white">חוויית פתיחת קריאה</td>
                    <td className="py-3.5 px-4 text-indigo-300 font-bold">שיחה חופשית מול סוכן Tony AI</td>
                    <td className="py-3.5 px-4 text-slate-400">טפסים ארוכים ומסורבלים בעשרות שדות</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-white">סיווג ושיוך תור</td>
                    <td className="py-3.5 px-4 text-indigo-300 font-bold">אוטונומי ומיידי (תת-שנייה)</td>
                    <td className="py-3.5 px-4 text-slate-400">מיון ידני ע״י מוקדן Tier 1</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-white">הקמה ותחזוקת תשתית</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">Zero Maintenance (ענן מנוהל)</td>
                    <td className="py-3.5 px-4 text-slate-400">שרתים מקומיים, שדרוגים ותחזוקת DB</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-white">תמיכה בשפות</td>
                    <td className="py-3.5 px-4 text-indigo-300 font-bold">עברית 🇮🇱 ואנגלית 🇺🇸 בלייב[cite: 1]</td>
                    <td className="py-3.5 px-4 text-slate-400">ממשקים נוקשים ללא מעבר שפה דינמי</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* -------------------- Contact & Enterprise Demo Section -------------------- */}
      <section id="contact" className="py-24 bg-[#0E1322] border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Enterprise Onboarding</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">מוכנים לייעל את מערך ה-IT בארגונכם?</h2>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">
              השאירו פרטים לקבלת סביבת הדגמה חיה מותאמת לדומיין הארגון שלכם.
            </p>
          </div>

          <div className="bg-slate-900/90 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl">
            {formSent ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-xl font-black text-white">הפנייה נשלחה בהצלחה!</h3>
                <p className="text-xs text-slate-400">צוות הפלטפורמה יצור עמך קשר לתיאום פגישה טכנית והקמת Tenant לבדיקה.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs font-bold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-slate-300">שם מלא *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="ישראל ישראלי"
                      className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-slate-300">אימייל ארגוני *</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="name@company.co.il"
                      className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium font-mono transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-slate-300">שם החברה / ארגון *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      placeholder="e.g. Rafael, IEC, High-Tech"
                      className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-slate-300">טלפון ליצירת קשר</label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="050-0000000"
                      className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium font-mono transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-slate-300">הערות וצרכים מיוחדים</label>
                  <textarea
                    rows={3}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="כמות משתמשים בארגון, מערכות קיימות, דרישות אבטחה..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium leading-relaxed transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>שליחת בקשה להקמת Tenant והדגמה</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* -------------------- Public Enterprise Footer -------------------- */}
      <footer className="bg-[#080B12] text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center border border-white/15 p-1">
              <Image src="/smartq-logo.png" alt="SmartQ" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <span className="text-white font-black text-sm">SmartQ Enterprise Cloud</span>
              <p className="text-[10px] text-slate-500">Global ITSM Orchestration Fabric</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400">
            <span>SLA Target: 99.99%</span>
            <span>•</span>
            <span>Zero-Trust Compliant</span>
            <span>•</span>
            <span>SAML 2.0 Ready[cite: 1]</span>
          </div>

          <p className="text-slate-500 font-medium">
            כל הזכויות שמורות © {new Date().getFullYear()} SmartQ.
          </p>
        </div>
      </footer>

      {/* -------------------- Accessibility Widget -------------------- */}
      <div className="fixed bottom-6 left-6 z-50">
        {!isA11yOpen ? (
          <button
            onClick={() => setIsA11yOpen(true)}
            className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl border border-white/20 transition flex items-center justify-center"
            title="תפריט נגישות (Accessibility)"
          >
            <Accessibility className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-80 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 space-y-4 text-xs text-slate-100">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-800">
              <div className="flex items-center gap-2 font-black text-indigo-400">
                <Accessibility className="w-5 h-5" />
                <span>התאמות נגישות ע״פ תקן</span>
              </div>
              <button
                onClick={() => setIsA11yOpen(false)}
                className="text-slate-400 hover:text-white font-black text-sm px-1.5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400">גודל גופן:</p>
              <div className="grid grid-cols-3 gap-1.5 font-bold">
                <button
                  onClick={() => setFontSizeLevel(-1)}
                  className={`p-2 rounded-xl border ${fontSizeLevel === -1 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                >
                  A- הקטן
                </button>
                <button
                  onClick={() => setFontSizeLevel(0)}
                  className={`p-2 rounded-xl border ${fontSizeLevel === 0 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                >
                  רגיל
                </button>
                <button
                  onClick={() => setFontSizeLevel(1)}
                  className={`p-2 rounded-xl border ${fontSizeLevel === 1 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                >
                  A+ הגדל
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 font-bold">
              <button
                onClick={() => setIsHighContrast(!isHighContrast)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  isHighContrast ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Contrast className="w-4 h-4" />
                  <span>ניגודיות צבעים</span>
                </div>
                <span>{isHighContrast ? 'פעיל' : 'כבוי'}</span>
              </button>

              <button
                onClick={() => setIsGrayscale(!isGrayscale)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  isGrayscale ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>גווני אפור</span>
                </div>
                <span>{isGrayscale ? 'פעיל' : 'כבוי'}</span>
              </button>

              <button
                onClick={() => setHighlightLinks(!highlightLinks)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  highlightLinks ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-200'
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
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>איפוס התאמות</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}