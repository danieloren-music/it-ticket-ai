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
  ShieldCheck,
  Globe,
  SlidersHorizontal
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
  tenant_id: string;
}

interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
}

function TenantAdminContent() {
  const params = useParams();
  const tenantSlug = (params?.tenant as string) || 'demo';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // טעינת פרטי הארגון
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

  // שליפת קריאות של הארגון הנוכחי בלבד
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

  // עדכון סטטוס קריאה בזמן אמת מול Supabase
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

  // KPIs
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
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'High':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'Resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Closed':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0E1526]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 bg-slate-900 flex items-center justify-center">
            <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">SmartQ Desk</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md">
                IT QUEUE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Building2 className="w-3 h-3 text-indigo-400" />
              <span>{tenant?.name || tenantSlug}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <a
            href={`/${tenantSlug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
          >
            <span>פורטל עובדים</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={fetchTickets}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
            title="רענן נתונים"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 bg-[#090D16] p-6 overflow-y-auto space-y-6">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#0E1526] border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">סך הכל קריאות בארגון</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats.total}</p>
              <span className="text-[11px] text-slate-400">{tenant?.name}</span>
            </div>

            <div className="bg-[#0E1526] border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">קריאות פתוחות</span>
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-black text-orange-400">{stats.open}</p>
              <span className="text-[11px] text-slate-400">ממתינות לטיפול</span>
            </div>

            <div className="bg-[#0E1526] border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">בטיפול פעיל</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-indigo-400">{stats.inProgress}</p>
              <span className="text-[11px] text-slate-400">אצל צוות ה-IT</span>
            </div>

            <div className="bg-[#0E1526] border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">קריטיות (Critical SLA)</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">{stats.critical}</p>
              <span className="text-[11px] text-slate-400">דחיפות עליונה</span>
            </div>

            <div className="bg-[#0E1526] border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">טופלו בהצלחה</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{stats.resolved}</p>
              <span className="text-[11px] text-slate-400">סטטוס Resolved</span>
            </div>
          </div>

          {/* Tickets Queue Data Table */}
          <div className="bg-[#0E1526] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש קריאה, שם עובד, מחלקה או מערכת..."
                  className="w-full bg-[#090D16] border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
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
                  className="bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
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
                  className="bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
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
                <thead className="bg-[#090D16]/60 text-slate-400 font-semibold border-b border-slate-800">
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
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>טוען קריאות שירות...</span>
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
                            <span className="inline-block mt-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
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
                                className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-lg transition"
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
        </main>
      </div>
    </div>
  );
}

export default function TenantAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090D16]" />}>
      <TenantAdminContent />
    </Suspense>
  );
}