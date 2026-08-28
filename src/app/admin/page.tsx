'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Layers, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Settings,
  Plus,
  ArrowUpDown,
  Tag,
  Briefcase
} from 'lucide-react';

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
  tenant_id?: string;
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'Enterprise' | 'Pro' | 'Trial';
  status: 'Active' | 'Pending' | 'Suspended';
  ssoEnabled: boolean;
}

const MOCK_TENANTS: Tenant[] = [
  { id: 'all', name: 'כל הארגונים (Super Admin)', domain: '*', plan: 'Enterprise', status: 'Active', ssoEnabled: true },
  { id: 'tenant-electric', name: 'חברת החשמל לישראל', domain: 'iec.co.il', plan: 'Enterprise', status: 'Active', ssoEnabled: true },
  { id: 'tenant-ams', name: 'AMS Advanced Measurement', domain: 'ams-sys.com', plan: 'Pro', status: 'Active', ssoEnabled: true },
  { id: 'tenant-demo', name: 'ארגון הדגמה (Sandbox)', domain: 'demo.smartdesk.ai', plan: 'Trial', status: 'Active', ssoEnabled: false },
];

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Tenant / Multi-tenant Filter
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'tickets' | 'tenants' | 'analytics' | 'settings'>('tickets');

  // Table Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error('Error fetching admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingId(ticketId);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (err: any) {
      alert('שגיאה בעדכון סטטוס: ' + err.message);
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

  // Statistics KPIs
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
        return 'bg-rose-500/10 text-rose-600 border-rose-200';
      case 'High':
        return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-sky-50 text-sky-700 border-sky-300';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Closed':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-orange-50 text-orange-700 border-orange-300';
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-sky-500/20">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">SmartDesk Admin Core</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md">
                MULTI-TENANT
              </span>
            </div>
            <p className="text-[11px] text-slate-400">ניהול קריאות, ארגונים ו-SAML Single Sign-On</p>
          </div>
        </div>

        {/* Tenant Selector & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl">
            <Building2 className="w-4 h-4 text-sky-400" />
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              {MOCK_TENANTS.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
          >
            <span>פתח פורטל עובדים</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={fetchTickets}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
            title="רענן נתונים"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-l border-slate-800 bg-slate-900/50 p-4 space-y-6 hidden md:block">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">ניהול מערכת</p>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('tickets')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'tickets'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4" />
                  <span>קריאות שירות (Queue)</span>
                </div>
                <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                  {stats.total}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('tenants')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'tenants'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4" />
                  <span>ארגונים ולקוחות (Tenants)</span>
                </div>
                <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                  3
                </span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'analytics'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>אנליטיקה ו-SLA</span>
              </button>
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">אינטגרציות ואבטחה</p>
            <nav className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 bg-slate-800/30 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Entra ID SAML</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">פעיל</span>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-6">
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">סך הכל קריאות</span>
                <Layers className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats.total}</p>
              <span className="text-[11px] text-slate-400">כלל ה-Namespaces</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">קריאות פתוחות</span>
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-black text-orange-400">{stats.open}</p>
              <span className="text-[11px] text-slate-400">ממתינות למענה ראשוני</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">בטיפול פעיל</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-black text-sky-400">{stats.inProgress}</p>
              <span className="text-[11px] text-slate-400">הוקצו לטכנאים</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">קריטיות (Critical SLA)</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">{stats.critical}</p>
              <span className="text-[11px] text-slate-400">דורשות מענה מיידי</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">טופלו בהצלחה</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{stats.resolved}</p>
              <span className="text-[11px] text-slate-400">סטטוס Resolved</span>
            </div>
          </div>

          {activeTab === 'tickets' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Table Controls / Filters Bar */}
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש קריאה, מדווח, מחלקה או מערכת..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="ALL">כל הקטגוריות</option>
                    <option value="Hardware">חומרה</option>
                    <option value="Software & SaaS">תוכנה וענן</option>
                    <option value="Network & Connectivity">תקשורת ו-VPN</option>
                    <option value="Access & IAM">הרשאות וזהויות</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">קריאה / נושא</th>
                      <th className="py-3 px-4">מדווח ואימייל</th>
                      <th className="py-3 px-4">צוות מטפל</th>
                      <th className="py-3 px-4">דחיפות</th>
                      <th className="py-3 px-4">סטטוס</th>
                      <th className="py-3 px-4">זמן פתיחה</th>
                      <th className="py-3 px-4 text-center">פעולות מהירות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                            <span>טוען נתונים ממסד הנתונים...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          לא נמצאו קריאות התואמות לחיפוש או הסינון.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-100">{ticket.title}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {ticket.description}
                            </div>
                            {ticket.system_impacted && (
                              <span className="inline-block mt-1 text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                                {ticket.system_impacted}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-200">{ticket.reporter_name || 'אנונימי'}</div>
                            <div className="text-[11px] text-slate-400">{ticket.reporter_email || '-'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-300 font-medium">{ticket.assigned_team || 'Helpdesk'}</span>
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
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
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
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 rounded-lg transition"
                                >
                                  קח לטיפול
                                </button>
                              )}
                              {ticket.status !== 'Resolved' && (
                                <button
                                  disabled={updatingId === ticket.id}
                                  onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg transition"
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
          )}

          {activeTab === 'tenants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">ניהול ארגונים ו-Namespaces</h2>
                  <p className="text-xs text-slate-400">הגדרת חיבורי SSO, מפתחות לקוח והפרדת נתונים מוחלטת</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition">
                  <Plus className="w-3.5 h-3.5" />
                  <span>הוסף ארגון חדש</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MOCK_TENANTS.filter((t) => t.id !== 'all').map((tenant) => (
                  <div key={tenant.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-sky-400">
                        {tenant.name.charAt(0)}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                        {tenant.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white">{tenant.name}</h3>
                      <p className="text-xs text-slate-400">{tenant.domain}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>מסלול: <strong className="text-slate-200">{tenant.plan}</strong></span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        SAML פעיל
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}