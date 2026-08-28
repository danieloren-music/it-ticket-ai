'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Layers, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  Sun, 
  Moon, 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Bell, 
  Cpu, 
  Settings 
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';

interface Ticket {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  system_impacted: string;
  assigned_team: string;
  reporter_name: string;
  reporter_email: string;
  tenant_id: string;
}

interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
}

function TenantAdminContent() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<'queue' | 'features'>('queue');
  const params = useParams();
  const tenantSlug = (params?.tenant as string) || 'demo';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Tenant Feature Toggles
  const [features, setFeatures] = useState({
    autoAiRouting: true,
    ssoEnforced: false,
    slaAlerts: true,
    autoCloseAfterResolved: true,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    const fetchTenant = async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantSlug)
        .single();

      if (data) {
        setTenant(data);
      } else {
        setTenant({
          id: tenantSlug,
          name: tenantSlug.toUpperCase(),
          domain: '',
          admin_email: '',
        });
      }
    };

    fetchTenant();
  }, [tenantSlug]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', tenantSlug)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error('Error fetching tenant admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [tenantSlug]);

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingId(ticketId);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)
        .eq('tenant_id', tenantSlug);

      if (error) throw error;

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (err: any) {
      alert('שגיאה בעדכון הסטטוס: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchSearch =
        ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.reporter_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.system_impacted?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
      const matchUrgency = urgencyFilter === 'ALL' || ticket.urgency === urgencyFilter;
      const matchCategory = categoryFilter === 'ALL' || ticket.category === categoryFilter;

      return matchSearch && matchStatus && matchUrgency && matchCategory;
    });
  }, [tickets, searchQuery, statusFilter, urgencyFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'Open' || !t.status).length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
    const critical = tickets.filter((t) => t.urgency === 'Critical').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

    return { total, open, inProgress, critical, resolved };
  }, [tickets]);

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800';
      case 'Medium':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800';
    }
  };

  const themeBg = {
    light: 'bg-[#F8FAFC] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-radial-at-t from-[#160B2E] via-[#090D1A] to-[#04060B] text-slate-100'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 shadow-sm text-slate-900',
    dark: 'bg-[#111827] border-slate-800 shadow-lg text-slate-100',
    ai: 'bg-[#130D2C]/80 border-indigo-500/40 shadow-xl shadow-indigo-500/10 backdrop-blur-xl text-slate-100'
  };

  const inputBg = {
    light: 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-600',
    dark: 'bg-[#1F2937] border-slate-700 text-slate-100 focus:border-indigo-400',
    ai: 'bg-[#1B1439] border-indigo-500/40 text-indigo-100 focus:border-cyan-400'
  };

  return (
    <div dir="rtl" className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 ${themeBg[theme]}`}>
      {/* Top Header */}
      <header className={`h-16 border-b sticky top-0 z-30 px-6 flex items-center justify-between backdrop-blur-md transition-colors duration-300 ${
        theme === 'light' ? 'bg-white/95 border-slate-200 shadow-2xs' :
        theme === 'dark' ? 'bg-[#0E1424]/95 border-slate-800' :
        'bg-[#0C081D]/90 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100">
            <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>SmartQ Desk</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md">
                IT CONTROL
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <Building2 className="w-3 h-3 text-indigo-500" />
              <span>{tenant?.name || tenantSlug}</span>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* Navigation Tabs */}
          <div className={`flex items-center p-1 rounded-xl border ${
            theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
          }`}>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'queue' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>תור קריאות ({stats.total})</span>
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'features' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>הגדרות Workspace</span>
            </button>
          </div>

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
              title="AI Neural Mode"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={`/${tenantSlug}`}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              theme === 'light' ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200' : 'text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
          >
            <span>פתח פורטל Zack AI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={fetchTickets}
            className={`p-2 rounded-xl border transition ${
              theme === 'light' ? 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200' : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
            title="רענן נתונים"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {activeTab === 'queue' && (
          <>
            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold">סך הכל קריאות</span>
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <p className={`text-2xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{stats.total}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{tenant?.name}</span>
              </div>

              <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold">קריאות פתוחות</span>
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.open}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">ממתינות לטיפול</span>
              </div>

              <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold">בטיפול פעיל</span>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.inProgress}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">אצל צוות ה-IT</span>
              </div>

              <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold">קריטיות (Critical)</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.critical}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">דחיפות עליונה</span>
              </div>

              <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold">טופלו בהצלחה</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.resolved}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">סטטוס Resolved</span>
              </div>
            </div>

            {/* Tickets Queue Data Table */}
            <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${cardBg[theme]}`}>
              {/* Filters Bar */}
              <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                theme === 'light' ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש קריאה, שם עובד, מחלקה או מערכת..."
                    className={`w-full rounded-xl pr-10 pl-4 py-2 text-xs border focus:outline-none transition ${inputBg[theme]}`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`rounded-xl px-3 py-2 text-xs border font-semibold focus:outline-none transition ${inputBg[theme]}`}
                  >
                    <option value="ALL">כל הסטטוסים</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className={`rounded-xl px-3 py-2 text-xs border font-semibold focus:outline-none transition ${inputBg[theme]}`}
                  >
                    <option value="ALL">כל הדחיפויות</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={`rounded-xl px-3 py-2 text-xs border font-semibold focus:outline-none transition ${inputBg[theme]}`}
                  >
                    <option value="ALL">כל הקטגוריות</option>
                    <option value="Hardware">חומרה</option>
                    <option value="Software & SaaS">תוכנה וענן</option>
                    <option value="Network & Connectivity">תקשורת ו-VPN</option>
                    <option value="Access & IAM">הרשאות וזהויות</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className={`border-b font-bold ${
                      theme === 'light' ? 'bg-slate-50/80 text-slate-700 border-slate-200' : 'bg-slate-900/60 text-slate-400 border-slate-800'
                    }`}>
                      <th className="py-3.5 px-4">קריאה / נושא</th>
                      <th className="py-3.5 px-4">מדווח ואימייל</th>
                      <th className="py-3.5 px-4">צוות מטפל</th>
                      <th className="py-3.5 px-4">דחיפות</th>
                      <th className="py-3.5 px-4">סטטוס</th>
                      <th className="py-3.5 px-4">זמן פתיחה</th>
                      <th className="py-3.5 px-4 text-center">פעולות מהירות</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'light' ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'}`}>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                            <span>טוען קריאות שירות...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                          לא נמצאו קריאות התואמות לחיפוש או הסינון.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{ticket.title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {ticket.description}
                            </div>
                            {ticket.system_impacted && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                {ticket.system_impacted}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>{ticket.reporter_name || 'אנונימי'}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{ticket.reporter_email || '-'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{ticket.assigned_team || 'Helpdesk'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getUrgencyBadge(ticket.urgency)}`}>
                              {ticket.urgency}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(ticket.status || 'Open')}`}>
                              {ticket.status || 'Open'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            {new Date(ticket.created_at).toLocaleDateString('he-IL', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && (
                                <button
                                  disabled={updatingId === ticket.id}
                                  onClick={() => handleUpdateStatus(ticket.id, 'In Progress')}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-950 rounded-lg transition border border-indigo-200 dark:border-indigo-800"
                                >
                                  קח לטיפול
                                </button>
                              )}
                              {ticket.status !== 'Resolved' && (
                                <button
                                  disabled={updatingId === ticket.id}
                                  onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950 rounded-lg transition border border-emerald-200 dark:border-emerald-800"
                                >
                                  סגור כנפתר
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB: WORKSPACE & FEATURE TOGGLES */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border space-y-6 ${cardBg[theme]}`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    הגדרות סביבה ופיצ'רים מתקדמים ({tenant?.name})
                  </h2>
                </div>
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    השינויים נשמרו בסביבה
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Toggle 1: Zack AI Auto Routing */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      <strong className="font-bold text-slate-900 dark:text-white">ניתוב וסיווג אוטומטי ע״י Zack AI</strong>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">ניתוח חכם של טקסט התקלה ושיוך אוטומטי לצוות הרלוונטי (Tier 1, Cloud, IAM).</p>
                  </div>
                  <button
                    onClick={() => {
                      setFeatures({ ...features, autoAiRouting: !features.autoAiRouting });
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="p-1 text-indigo-600 hover:opacity-80 transition"
                  >
                    {features.autoAiRouting ? <ToggleRight className="w-8 h-8 text-indigo-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                  </button>
                </div>

                {/* Toggle 2: SSO Enforcement */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <strong className="font-bold text-slate-900 dark:text-white">חובת הזדהות ארגונית (SSO Enforcement)</strong>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">מניעת פתיחת קריאות אנונימיות, חיוב כניסה דרך Microsoft Entra ID בלבד.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFeatures({ ...features, ssoEnforced: !features.ssoEnforced });
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="p-1 text-indigo-600 hover:opacity-80 transition"
                  >
                    {features.ssoEnforced ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                  </button>
                </div>

                {/* Toggle 3: SLA Notifications */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orange-500" />
                      <strong className="font-bold text-slate-900 dark:text-white">התרעות חריגת SLA בזמן אמת</strong>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">שליחת התרעה למנהל ה-IT כאשר קריאה קריטית לא נפתרת תוך 60 דקות.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFeatures({ ...features, slaAlerts: !features.slaAlerts });
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="p-1 text-indigo-600 hover:opacity-80 transition"
                  >
                    {features.slaAlerts ? <ToggleRight className="w-8 h-8 text-orange-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                  </button>
                </div>

                {/* Toggle 4: Auto-Archive */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-500" />
                      <strong className="font-bold text-slate-900 dark:text-white">סגירה אוטומטית לקריאות שנפתרו</strong>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">העברה אוטומטית של קריאות מ-Resolved ל-Closed לאחר 48 שעות ללא תגובה.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFeatures({ ...features, autoCloseAfterResolved: !features.autoCloseAfterResolved });
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="p-1 text-indigo-600 hover:opacity-80 transition"
                  >
                    {features.autoCloseAfterResolved ? <ToggleRight className="w-8 h-8 text-sky-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TenantAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <TenantAdminContent />
    </Suspense>
  );
}