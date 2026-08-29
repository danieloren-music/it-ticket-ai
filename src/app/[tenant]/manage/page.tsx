'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Layers, 
  Plus, 
  Search, 
  Sun, 
  Moon, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  Save, 
  Trash2, 
  MapPin, 
  Phone, 
  Mail, 
  UserPlus, 
  Lock, 
  RefreshCw,
  BarChart3,
  KeyRound,
  Shield,
  Activity,
  Server,
  Settings,
  HelpCircle,
  Bell,
  AlertTriangle,
  ChevronDown,
  Clock,
  Check,
  Zap,
  Radio,
  Sliders,
  Database
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';
type RadwareNav = 'overview' | 'protection' | 'directory' | 'sso' | 'settings' | 'logs';

interface DirectoryUser {
  id?: string;
  email: string;
  full_name: string;
  role: 'User' | 'Admin' | 'Manager';
  job_title?: string;
  department?: string;
  site_location?: string;
  phone_number?: string;
  is_active?: boolean;
}

function ManageConsoleContent() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();

  const [activeNav, setActiveNav] = useState<RadwareNav>('directory');
  const [subTab, setSubTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'User' as 'User' | 'Admin' | 'Manager',
    jobTitle: 'עובד ארגון',
    department: 'כללי',
    siteLocation: 'מטה ראשי',
    phoneNumber: ''
  });

  const fetchDirectory = async () => {
    if (!tenantSlug) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/directory?tenantSlug=${tenantSlug}`);
      const data = await res.json();
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
      } else {
        setUsers([
          {
            email: `admin@${tenantSlug}.com`,
            full_name: 'מנהל מערכת ראשי',
            role: 'Manager',
            department: 'IT & Security',
            site_location: 'מטה מרכזי',
            phone_number: '050-0000000',
            is_active: true
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch directory', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [tenantSlug]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.fullName) return;

    setSavingUser(true);
    try {
      const res = await fetch('/api/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          ...newUserData
        })
      });

      if (!res.ok) throw new Error('שגיאה בשמירת המשתמש');

      setIsAddUserOpen(false);
      setNewUserData({
        fullName: '',
        email: '',
        password: '',
        role: 'User',
        jobTitle: 'עובד ארגון',
        department: 'כללי',
        siteLocation: 'מטה ראשי',
        phoneNumber: ''
      });
      fetchDirectory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      u.site_location?.toLowerCase().includes(q)
    );
  });

  const themeBg = {
    light: 'bg-[#F4F6F9] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e0847] via-[#0b051e] to-[#04010d] text-cyan-50'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 text-slate-900 shadow-xs',
    dark: 'bg-[#111827] border-slate-800 text-slate-100 shadow-xl',
    ai: 'bg-[#180b38]/90 border-cyan-500/30 text-cyan-100 shadow-lg'
  };

  return (
    <div dir="rtl" className={`min-h-screen flex flex-col font-sans antialiased select-none ${themeBg[theme]}`}>
      
      {/* 1. Radware Style Top Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1424] px-4 flex items-center justify-between sticky top-0 z-40">
        
        {/* Left / Center Breadcrumbs & Tenant Select */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1">
              <Image src="/smartq-logo.png" alt="SmartQ" width={28} height={28} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-500 dark:text-slate-400">
              <span className="text-indigo-600 dark:text-indigo-400 font-black">SmartQ</span>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold uppercase">{rawTenant}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-800 dark:text-slate-200">{rawTenant.toUpperCase()} ENTERPRISE</span>
          </div>

          {/* System Notification Banners (Radware Style) */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>SLA Target: 99.8% Active</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>AI-Xpert v2</span>
          </div>

          {/* Theme switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTheme('light')}
              className={`p-1 rounded-md transition ${theme === 'light' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'}`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1 rounded-md transition ${theme === 'dark' ? 'bg-slate-700 text-indigo-400 shadow-xs' : 'text-slate-500'}`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={`/${rawTenant}/admins`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition"
          >
            <span>תור קריאות IT</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            AD
          </div>
        </div>

      </header>

      {/* 2. Main Wrapper with Radware Left Sidebar & Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Radware Slim Left Icon Sidebar */}
        <aside className="w-14 bg-[#1E293B] border-r border-slate-700 text-slate-300 flex flex-col items-center py-4 justify-between shrink-0 z-30">
          <div className="space-y-4 w-full flex flex-col items-center">
            
            <button
              onClick={() => setActiveNav('overview')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="סקירה כללית ואנליטיקות"
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('protection')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'protection' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="חוקים וניתוב תורים"
            >
              <Shield className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('directory')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'directory' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="מרכז משתמשים והרשאות (Directory)"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('sso')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'sso' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="אינטגרציית Entra / SAML SSO"
            >
              <KeyRound className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('logs')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="יומני ביקורת ו-Audit Logs"
            >
              <Activity className="w-5 h-5" />
            </button>

          </div>

          <div className="space-y-2 flex flex-col items-center">
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="עזרה ותמיכה">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="הגדרות מערכת">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Sub Navigation Bar (Overview, Application Protection, Directory) */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{activeNav === 'directory' ? 'ניהול זהויות, משתמשים והרשאות (Directory)' : 'מרכז בקרה ותפעול (Control Center)'}</span>
              </h1>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ארגון: {rawTenant}</span>
            </div>

            {activeNav === 'directory' && (
              <button
                type="button"
                onClick={() => setIsAddUserOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ הוסף משתמש ארגוני</span>
              </button>
            )}
          </div>

          {/* Directory Module View */}
          {activeNav === 'directory' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
              
              {/* Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-inherit/40 pb-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black">
                  <button
                    onClick={() => setSubTab('users')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      subTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    משתמשי ארגון ({users.length})
                  </button>
                  <button
                    onClick={() => setSubTab('groups')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      subTab === 'groups' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    קבוצות אבטחה (Security Groups)
                  </button>
                </div>

                <div className="relative w-72">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש משתמש, אימייל או מטה..."
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Users Table */}
              {subTab === 'users' && (
                <div className="border border-inherit/40 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 border-b border-inherit/40 font-black">
                        <th className="py-3 px-4">שם עובד מלא</th>
                        <th className="py-3 px-4">כתובת אימייל ארגונית</th>
                        <th className="py-3 px-4">תפקיד / הרשאה (Role)</th>
                        <th className="py-3 px-4">מחלקה ועיר / מטה</th>
                        <th className="py-3 px-4">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inherit/30 font-semibold">
                      {filteredUsers.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                            {u.full_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-mono font-bold">
                            {u.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                              u.role === 'Manager' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300' :
                              u.role === 'Admin' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300' :
                              'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            {u.department || 'כללי'} • {u.site_location || 'מטה ראשי'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Security Groups View */}
              {subTab === 'groups' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                    <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                      <span>קבוצת מנהלים</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded font-black">Managers</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">הרשאת ניהול מלאה ל-Manage, Directory וקריאות IT.</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                    <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                      <span>קבוצת טכנאים</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded font-black">Admins</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">גישה לתור הקריאות (Admins Desk) וטיפול בפניות.</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                    <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                      <span>קבוצת עובדי ארגון</span>
                      <span className="text-[10px] bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded font-black">Users</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">הרשאה לפתיחת קריאות שירות דרך Zack AI.</p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Overview & Security Telemetry (Radware Widget Grid Style) */}
          {activeNav === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className={`p-5 rounded-2xl border space-y-3 ${cardBg[theme]}`}>
                <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span>קריאות IT שנפתחו היום</span>
                  <Activity className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-black text-indigo-600">24</div>
                <p className="text-[11px] text-slate-500">100% נותבו אוטומטית לצוותי ה-IT המתאימים</p>
              </div>

              <div className={`p-5 rounded-2xl border space-y-3 ${cardBg[theme]}`}>
                <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span>זמן מענה ממוצע (MTTR)</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-600">12 דק׳</div>
                <p className="text-[11px] text-slate-500">עמידה ביעד SLA של 99.4%</p>
              </div>

              <div className={`p-5 rounded-2xl border space-y-3 ${cardBg[theme]}`}>
                <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span>משתמשים פעילים ב-Directory</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl font-black text-purple-600">{users.length}</div>
                <p className="text-[11px] text-slate-500">מסונכרנים מקומית וב-Entra ID</p>
              </div>
            </div>
          )}

          {/* SSO / Entra Config View */}
          {activeNav === 'sso' && (
            <div className={`p-6 rounded-2xl border space-y-6 ${cardBg[theme]}`}>
              <div className="border-b border-inherit/40 pb-3">
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>הגדרות Microsoft Entra ID (SAML 2.0 Single Sign-On)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  הגדרת סנכרון זהויות אוטומטי מול ה-Tenant של הארגון ב-Azure / Entra ID
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-2">
                  <span className="font-bold text-slate-500">Identifier (Entity ID)</span>
                  <div className="font-mono text-indigo-600 font-bold break-all">https://it-ticket-ai-beige.vercel.app/api/auth/saml/metadata</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-2">
                  <span className="font-bold text-slate-500">Reply URL (Assertion Consumer Service)</span>
                  <div className="font-mono text-indigo-600 font-bold break-all">https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback</div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ADD ENTERPRISE USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 border shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${cardBg[theme]}`}>
            
            <div className="flex items-center justify-between border-b pb-4 border-inherit/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">הוספת משתמש חדש ל-Directory</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">הקצאת חשבון ארגוני מקומי וקביעת הרשאות</p>
                </div>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="opacity-70 hover:opacity-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800 dark:text-slate-300">שם מלא *</label>
                  <input
                    type="text"
                    required
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    placeholder="למשל: דניאל אורן"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800 dark:text-slate-300">אימייל ארגוני *</label>
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder={`user@${tenantSlug}.co.il`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800 dark:text-slate-300">סיסמה ראשונית</label>
                  <input
                    type="text"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="ברירת מחדל: SmartQ2026!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800 dark:text-slate-300">תפקיד / הרשאה (Role)</label>
                  <select
                    value={newUserData.role}
                    onChange={(e: any) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-black"
                  >
                    <option value="User">User (עובד ארגון - פתיחת קריאות)</option>
                    <option value="Admin">Admin (טכנאי IT - ניהול קריאות)</option>
                    <option value="Manager">Manager (מנהל מערכת ראשי)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800 dark:text-slate-300">מחלקה</label>
                  <input
                    type="text"
                    value={newUserData.department}
                    onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    placeholder="למשל: הנדסה ותפעול"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800 dark:text-slate-300">עיר / מטה (City / HQ)</label>
                  <input
                    type="text"
                    value={newUserData.siteLocation}
                    onChange={(e) => setNewUserData({ ...newUserData, siteLocation: e.target.value })}
                    placeholder="למשל: מטה צפון - חיפה"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-inherit/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingUser ? 'שומר...' : 'שמור משתמש ב-Directory'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default function TenantManagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6F9]" />}>
      <ManageConsoleContent />
    </Suspense>
  );
}