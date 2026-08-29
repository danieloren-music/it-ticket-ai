'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Save, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  Edit3,
  X,
  Sun,
  Moon
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';

interface Ticket {
  id: string;
  ticket_number?: string;
  user_name?: string;
  reporter_name?: string;
  user_email?: string;
  reporter_email?: string;
  user_phone?: string;
  user_city?: string;
  title: string;
  description: string;
  category: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Pending User' | 'Resolved' | 'Closed';
  assigned_team: string;
  assigned_technician?: string;
  admin_internal_notes?: string;
  created_at: string;
}

function AdminsQueue() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');

  const fetchTickets = async () => {
    if (!tenantSlug) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .ilike('tenant_id', tenantSlug)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
      
      if (selectedTicket) {
        const updated = (data || []).find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [tenantSlug]);

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSavingEdit(true);
    setEditSuccess(false);

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: selectedTicket.status,
          urgency: selectedTicket.urgency,
          assigned_team: selectedTicket.assigned_team,
          assigned_technician: selectedTicket.assigned_technician || '',
          admin_internal_notes: selectedTicket.admin_internal_notes || '',
          user_city: selectedTicket.user_city || ''
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2500);
      fetchTickets();
    } catch (err: any) {
      alert('שגיאה בעדכון הקריאה: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const num = t.ticket_number || '';
    const name = t.user_name || t.reporter_name || '';
    const subj = t.title || '';
    const city = t.user_city || '';
    const q = searchQuery.toLowerCase();

    const matchesSearch = num.includes(q) || name.toLowerCase().includes(q) || subj.toLowerCase().includes(q) || city.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'ALL' || t.urgency === urgencyFilter;

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const themeBg = {
    light: 'bg-[#F8FAFC] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-radial-at-t from-[#160B2E] via-[#090D1A] to-[#04060B] text-slate-100'
  };

  const headerBg = {
    light: 'bg-white/95 border-slate-200 shadow-2xs text-slate-900',
    dark: 'bg-[#0E1424]/95 border-slate-800 text-white',
    ai: 'bg-[#0C081D]/90 border-indigo-500/30 text-white'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 shadow-sm text-slate-900',
    dark: 'bg-[#111827] border-slate-800 shadow-xl text-slate-100',
    ai: 'bg-[#130D2C]/90 border-indigo-500/40 shadow-xl text-slate-100'
  };

  const tableHeaderBg = {
    light: 'bg-slate-50 border-slate-200 text-slate-600 font-black',
    dark: 'bg-slate-900/60 border-slate-800 text-slate-400 font-black',
    ai: 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300 font-black'
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
              <span className="text-base font-black">SmartQ Admin Desk</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md">
                IT OPERATIONS
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
              <Building2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>תור קריאות של {rawTenant}</span>
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
              title="Bright Light Mode"
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
            href={`/${rawTenant}/manage`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl border transition ${
              theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <span>קונסולת ניהול (Manage)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={fetchTickets}
            className={`p-2 rounded-xl border transition ${
              theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="רענן קריאות"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Queue Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Filter & Search Bar */}
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${cardBg[theme]}`}>
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש לפי מספר קריאה (6 ספרות), שם פונה, עיר/מטה או נושא..."
                className={`w-full pr-10 pl-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-600' : 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border focus:outline-none ${
                theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <option value="ALL">כל הסטטוסים</option>
              <option value="Open">Open (פתוח)</option>
              <option value="In Progress">In Progress (בטיפול)</option>
              <option value="Pending User">Pending User (ממתין לפונה)</option>
              <option value="Resolved">Resolved (נפתר)</option>
              <option value="Closed">Closed (סגור)</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border focus:outline-none ${
                theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <option value="ALL">כל הדחיפויות</option>
              <option value="Critical">Critical (קריטי)</option>
              <option value="High">High (גבוהה)</option>
              <option value="Medium">Medium (בינונית)</option>
              <option value="Low">Low (נמוכה)</option>
            </select>
          </div>
        </div>

        {/* Tickets Grid / Table */}
        <div className={`border rounded-3xl overflow-hidden shadow-sm ${cardBg[theme]}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className={`border-b ${tableHeaderBg[theme]}`}>
                  <th className="py-3 px-4">מספר קריאה</th>
                  <th className="py-3 px-4">שם הפונה</th>
                  <th className="py-3 px-4">עיר / מטה</th>
                  <th className="py-3 px-4">נושא הפנייה</th>
                  <th className="py-3 px-4">דחיפות</th>
                  <th className="py-3 px-4">צוות מטפל</th>
                  <th className="py-3 px-4">סטטוס</th>
                  <th className="py-3 px-4">זמן פתיחה</th>
                  <th className="py-3 px-4 text-center">פעולה</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-semibold ${theme === 'light' ? 'divide-slate-200' : 'divide-slate-800'}`}>
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`cursor-pointer transition ${
                      theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-black text-indigo-600 dark:text-indigo-400">
                      #{t.ticket_number || t.id.slice(0, 6)}
                    </td>
                    <td className="py-3.5 px-4 font-black">{t.user_name || t.reporter_name || 'עובד ארגון'}</td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1 opacity-80">
                        <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        {t.user_city || 'מטה ראשי'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">{t.title}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                        t.urgency === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300' :
                        t.urgency === 'High' ? 'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/60 dark:text-orange-300' :
                        t.urgency === 'Medium' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300' :
                        'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {t.urgency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{t.assigned_team}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                        t.status === 'Resolved' || t.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        t.status === 'In Progress' ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 opacity-75 text-[11px]">
                      {new Date(t.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="p-1.5 rounded-lg border bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* FULL TICKET DETAILS & EDIT DRAWER / MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto border ${cardBg[theme]}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-inherit/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-mono font-black text-sm">
                  #{selectedTicket.ticket_number || selectedTicket.id.slice(0, 6)}
                </div>
                <div>
                  <h2 className="text-base font-black">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-2 text-xs opacity-75 mt-0.5">
                    <span>פונה: {selectedTicket.user_name || selectedTicket.reporter_name || 'עובד ארגון'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      {selectedTicket.user_city || 'מטה ראשי'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="opacity-70 hover:opacity-100 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Description */}
            <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="font-bold opacity-75">תיאור הפנייה המקורי (פונה):</div>
              <p className="leading-relaxed whitespace-pre-wrap font-medium">{selectedTicket.description}</p>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleUpdateTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5 opacity-90">סטטוס קריאה</label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e: any) => setSelectedTicket({ ...selectedTicket, status: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-bold ${
                      theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value="Open">Open (פתוח)</option>
                    <option value="In Progress">In Progress (בטיפול)</option>
                    <option value="Pending User">Pending User (ממתין למשתמש)</option>
                    <option value="Resolved">Resolved (נפתר)</option>
                    <option value="Closed">Closed (סגור)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 opacity-90">רמת דחיפות</label>
                  <select
                    value={selectedTicket.urgency}
                    onChange={(e: any) => setSelectedTicket({ ...selectedTicket, urgency: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-bold ${
                      theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value="Critical">Critical (קריטי)</option>
                    <option value="High">High (גבוהה)</option>
                    <option value="Medium">Medium (בינונית)</option>
                    <option value="Low">Low (נמוכה)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 opacity-90">צוות מטפל</label>
                  <input
                    type="text"
                    value={selectedTicket.assigned_team}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, assigned_team: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-bold ${
                      theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5 opacity-90">טכנאי מטפל (Assignee)</label>
                  <input
                    type="text"
                    value={selectedTicket.assigned_technician || ''}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, assigned_technician: e.target.value })}
                    placeholder="הקצה טכנאי אישי..."
                    className={`w-full px-3 py-2.5 rounded-xl border font-bold ${
                      theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 opacity-90">הערות פנימיות של צוות ה-IT (Internal Admin Notes)</label>
                <textarea
                  rows={3}
                  value={selectedTicket.admin_internal_notes || ''}
                  onChange={(e) => setSelectedTicket({ ...selectedTicket, admin_internal_notes: e.target.value })}
                  placeholder="הערות לטיפול, צעדי דיאגנוסטיקה שבוצעו..."
                  className={`w-full px-3 py-2 rounded-xl border leading-relaxed ${
                    theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-inherit/30 flex items-center justify-between">
                {editSuccess ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> הקריאה עודכנה בהצלחה!
                  </span>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    סגור
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md transition flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingEdit ? 'שומר...' : 'שמור שינויים בקריאה'}</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default function TenantAdminsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <AdminsQueue />
    </Suspense>
  );
}