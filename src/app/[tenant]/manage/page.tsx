'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
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
  Shield
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';
type ActiveTab = 'directory' | 'dashboard' | 'sso';

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

  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
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
        // Fallback default admin if directory is empty
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
    light: 'bg-[#F8FAFC] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-radial-at-t from-[#160B2E] via-[#090D1A] to-[#04060B] text-slate-100'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 shadow-sm text-slate-900',
    dark: 'bg-[#111827] border-slate-800 shadow-xl text-slate-100',
    ai: 'bg-[#130D2C]/90 border-indigo-500/40 shadow-xl text-slate-100'
  };

  const headerBg = {
    light: 'bg-white/95 border-slate-200 text-slate-900 shadow-2xs',
    dark: 'bg-[#0E1424]/95 border-slate-800 text-white',
    ai: 'bg-[#0C081D]/90 border-indigo-500/30 text-white'
  };

  const tableHeaderBg = {
    light: 'bg-slate-100/80 border-slate-200 text-slate-700 font-black',
    dark: 'bg-slate-900/80 border-slate-800 text-slate-300 font-black',
    ai: 'bg-indigo-950/60 border-indigo-500/30 text-indigo-200 font-black'
  };

  return (
    <div dir="rtl" className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 ${themeBg[theme]}`}>
      
      {/* Top Header */}
      <header className={`h-16 border-b sticky top-0 z-30 px-6 flex items-center justify-between backdrop-blur-md transition-colors duration-300 ${headerBg[theme]}`}>
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100">
            <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">SmartQ Identity & Ops</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-md">
                ADMIN CONSOLE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>ניהול ארגון: {rawTenant}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Capsule */}
          <div className={`flex items-center p-1 rounded-xl border ${
            theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
          }`}>
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg transition ${theme === 'light' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-white'}`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg transition ${theme === 'dark' ? 'bg-slate-700 text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-white'}`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('ai')}
              className={`p-1.5 rounded-lg transition ${theme === 'ai' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              title="AI Mode"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={`/${rawTenant}/admins`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 transition"
          >
            <span>תור קריאות IT</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-4">
          <div className={`p-4 rounded-3xl border ${cardBg[theme]}`}>
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 px-3 block mb-2">מרכז שליטה ובקרה</span>
            <nav className="space-y-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab('directory')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition ${
                  activeTab === 'directory'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>Directory (משתמשים וקבוצות)</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" />
                  <span>דשבורד ואנליטיקות</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('sso')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition ${
                  activeTab === 'sso'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4" />
                  <span>אינטגרציית Entra / SSO</span>
                </div>
              </button>
            </nav>
          </div>
        </aside>

        {/* Tab Workspace */}
        <section className="lg:col-span-9 space-y-6">
          
          {/* Header Banner */}
          <div className={`p-6 rounded-3xl border flex items-center justify-between ${cardBg[theme]}`}>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>ניהול משתמשים, תפקידים וקבוצות (Directory)</span>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                ניהול זהויות, בקרת גישה (RBAC), שיוך מחלקות וערים בארגון {rawTenant}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ הוסף משתמש חדש</span>
            </button>
          </div>

          {/* Directory Panel */}
          <div className={`p-6 rounded-3xl border space-y-4 ${cardBg[theme]}`}>
            
            {/* Sub Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-inherit/40 pb-4">
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black">
                <button
                  onClick={() => setSubTab('users')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    subTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  משתמשים (Users - {users.length})
                </button>
                <button
                  onClick={() => setSubTab('groups')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    subTab === 'groups' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  קבוצות אבטחה (Groups)
                </button>
              </div>

              <div className="relative w-72">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש משתמש, אימייל או מטה..."
                  className={`w-full pr-9 pl-3 py-2 text-xs rounded-xl border font-medium focus:outline-none ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-600'
                      : 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Users Table */}
            {subTab === 'users' && (
              <div className="border border-inherit/40 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className={`border-b ${tableHeaderBg[theme]}`}>
                      <th className="py-3 px-4">שם המשתמש</th>
                      <th className="py-3 px-4">כתובת אימייל</th>
                      <th className="py-3 px-4">תפקיד במערכת (Role)</th>
                      <th className="py-3 px-4">מחלקה ועיר / מטה</th>
                      <th className="py-3 px-4">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit/30 font-semibold">
                    {filteredUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                          {u.full_name}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                            u.role === 'Manager' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' :
                            u.role === 'Admin' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' :
                            'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {u.department || 'כללי'} • {u.site_location || 'מטה ראשי'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
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

            {/* Groups Tab */}
            {subTab === 'groups' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>קבוצת מנהלים</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded">Managers</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">הרשאת ניהול מלאה ל-Manage, Directory וקריאות IT.</p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>קבוצת טכנאים</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded">Admins</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">גישה לתור הקריאות (Admins Desk) וטיפול בפניות.</p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>קבוצת עובדי ארגון</span>
                    <span className="text-[10px] bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded">Users</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">הרשאה לפתיחת קריאות שירות דרך Zack AI.</p>
                </div>
              </div>
            )}

          </div>

        </section>

      </main>

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
                    placeholder="למשל: ישראל ישראלי"
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
                  <span>{savingUser ? 'שומר משתמש...' : 'שמור משתמש ב-Directory'}</span>
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
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <ManageConsoleContent />
    </Suspense>
  );
}