'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Search, 
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
  Layers,
  Sparkles,
  Edit3,
  X,
  Sliders,
  Activity,
  Settings,
  HelpCircle,
  KeyRound,
  Users,
  Shield
} from 'lucide-react';

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

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased select-none">
      
      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1 shadow-2xs">
              <Image src="/smartq-logo.png" alt="SmartQ" width={28} height={28} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="text-indigo-600 font-black text-sm">SmartQ</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800 font-extrabold uppercase">{rawTenant}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-800">IT QUEUE & OPERATIONS</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>AI DISPATCH</span>
          </div>

          <a
            href={`/${rawTenant}/manage`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-black border border-slate-200 transition"
          >
            <span>קונסולת ניהול</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={fetchTickets}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="רענן"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-14 bg-[#1E293B] border-r border-slate-800 text-slate-300 flex flex-col items-center py-4 justify-between shrink-0 z-30">
          <div className="space-y-4 w-full flex flex-col items-center">
            <button className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md" title="תור קריאות">
              <Layers className="w-5 h-5" />
            </button>
            <a href={`/${rawTenant}/manage`} className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="משתמשים וניהול">
              <Users className="w-5 h-5" />
            </a>
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="סטטיסטיקות">
              <Activity className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2 flex flex-col items-center">
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h1 className="text-lg font-black text-slate-900">תור קריאות שירות ותפעול IT ({filteredTickets.length})</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">ניטור, הקצאת טכנאים וסגירת פניות שירות</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש לפי מספר קריאה (6 ספרות), שם פונה, עיר או נושא..."
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none"
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
                className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none"
              >
                <option value="ALL">כל הדחיפויות</option>
                <option value="Critical">Critical (קריטי)</option>
                <option value="High">High (גבוהה)</option>
                <option value="Medium">Medium (בינונית)</option>
                <option value="Low">Low (נמוכה)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black">
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
                <tbody className="divide-y divide-slate-200 font-semibold bg-white">
                  {filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="cursor-pointer hover:bg-slate-50 transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-indigo-600">
                        #{t.ticket_number || t.id.slice(0, 6)}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{t.user_name || t.reporter_name || 'עובד ארגון'}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-600" />
                          {t.user_city || 'מטה ראשי'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-800 font-bold">{t.title}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                          t.urgency === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          t.urgency === 'High' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                          t.urgency === 'Medium' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                          'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {t.urgency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{t.assigned_team}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                          t.status === 'Resolved' || t.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          t.status === 'In Progress' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(t.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-indigo-600 hover:text-white transition">
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
      </div>

      {/* FULL TICKET DETAILS & EDIT DRAWER / MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200 bg-white">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-mono font-black text-sm">
                  #{selectedTicket.ticket_number || selectedTicket.id.slice(0, 6)}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                    <span>פונה: {selectedTicket.user_name || selectedTicket.reporter_name || 'עובד ארגון'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600" />
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

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <div className="font-black text-slate-800">תיאור הפנייה המקורי (פונה):</div>
              <p className="leading-relaxed whitespace-pre-wrap font-medium text-slate-700">{selectedTicket.description}</p>
            </div>

            <form onSubmit={handleUpdateTicket} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-slate-800">סטטוס קריאה</label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e: any) => setSelectedTicket({ ...selectedTicket, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none"
                  >
                    <option value="Open">Open (פתוח)</option>
                    <option value="In Progress">In Progress (בטיפול)</option>
                    <option value="Pending User">Pending User (ממתין למשתמש)</option>
                    <option value="Resolved">Resolved (נפתר)</option>
                    <option value="Closed">Closed (סגור)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 text-slate-800">רמת דחיפות</label>
                  <select
                    value={selectedTicket.urgency}
                    onChange={(e: any) => setSelectedTicket({ ...selectedTicket, urgency: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none"
                  >
                    <option value="Critical">Critical (קריטי)</option>
                    <option value="High">High (גבוהה)</option>
                    <option value="Medium">Medium (בינונית)</option>
                    <option value="Low">Low (נמוכה)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 text-slate-800">צוות מטפל</label>
                  <input
                    type="text"
                    value={selectedTicket.assigned_team}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, assigned_team: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-slate-800">טכנאי מטפל (Assignee)</label>
                  <input
                    type="text"
                    value={selectedTicket.assigned_technician || ''}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, assigned_technician: e.target.value })}
                    placeholder="הקצה טכנאי אישי..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-800">הערות פנימיות של צוות ה-IT (Internal Admin Notes)</label>
                <textarea
                  rows={3}
                  value={selectedTicket.admin_internal_notes || ''}
                  onChange={(e) => setSelectedTicket({ ...selectedTicket, admin_internal_notes: e.target.value })}
                  placeholder="הערות לטיפול, צעדי דיאגנוסטיקה שבוצעו..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium leading-relaxed focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                {editSuccess ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> הקריאה עודכנה בהצלחה!
                  </span>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
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