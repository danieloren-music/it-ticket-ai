'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Building2, 
  Layers, 
  Plus, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Save, 
  Trash2, 
  RefreshCw,
  BarChart3,
  Shield,
  Activity,
  Settings,
  Users,
  Globe,
  Edit2,
  Clock
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
  status: string;
  created_at: string;
}

type PlatformTab = 'tenants' | 'analytics' | 'security' | 'admins';

export default function PlatformMasterConsole() {
  const [activeTab, setActiveTab] = useState<PlatformTab>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit Tenant
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({
    id: '',
    name: '',
    domain: '',
    adminEmail: '',
    status: 'Active'
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/tenants');
      const data = await res.json();
      if (data.tenants) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setTenantFormData({
      id: '',
      name: '',
      domain: '',
      adminEmail: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Tenant) => {
    setModalMode('edit');
    setTenantFormData({
      id: t.id,
      name: t.name,
      domain: t.domain,
      adminEmail: t.admin_email,
      status: t.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantFormData.id || !tenantFormData.name) return;
    setSavingTenant(true);

    try {
      const res = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantFormData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save organization');

      setIsModalOpen(false);
      fetchTenants();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSavingTenant(false);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to completely delete organization "${name}" (${id}) and all associated data?`)) return;
    try {
      const res = await fetch(`/api/platform/tenants?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tenant');
      fetchTenants();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredTenants = tenants.filter((t) =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased select-none">
      
      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1 shadow-2xs">
              <Image src="/smartq-logo.png" alt="SmartQ" width={28} height={28} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-indigo-600 font-black text-sm">SmartQ</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-extrabold uppercase">Cloud Platform Controller</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-800">Multi-Tenancy Global Fabric</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1 rounded-md text-[11px] font-black tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>Vendor Root</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Online</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            DO
          </div>
        </div>
      </header>

      {/* Main Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Slim Navigation */}
        <aside className="w-14 bg-[#1E293B] border-r border-slate-800 text-slate-300 flex flex-col items-center py-4 justify-between shrink-0 z-30">
          <div className="space-y-4 w-full flex flex-col items-center">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`p-2.5 rounded-xl transition ${activeTab === 'tenants' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Organizations & Tenants"
            >
              <Layers className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`p-2.5 rounded-xl transition ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Platform Telemetry & SLA"
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`p-2.5 rounded-xl transition ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Global Security Policies"
            >
              <Shield className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('admins')}
              className={`p-2.5 rounded-xl transition ${activeTab === 'admins' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Platform Administrators"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 flex flex-col items-center">
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="Audit Logs">
              <Activity className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="Platform Settings">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>{activeTab === 'tenants' ? 'Organizations & Customer Environments' : 'Vendor Cloud Analytics'}</span>
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Centralized multi-tenant management, routing rules, and domain configuration
              </p>
            </div>

            {activeTab === 'tenants' && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard New Organization</span>
              </button>
            )}
          </div>

          {/* Tenants Tab */}
          {activeTab === 'tenants' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Active Tenants ({tenants.length})</span>
                </div>

                <div className="relative w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, slug or domain..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-500 font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading tenant configurations...
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 font-bold">
                  No organizations found matching search criteria.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black">
                        <th className="py-3 px-4">Organization Name</th>
                        <th className="py-3 px-4">Slug / Route ID</th>
                        <th className="py-3 px-4">Primary Domain</th>
                        <th className="py-3 px-4">Default Admin</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Quick Portals</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold bg-white">
                      {filteredTenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-black text-slate-900">
                            {t.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                            /{t.id}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {t.domain}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {t.admin_email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <a
                                href={`/${t.id}/new-request`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[10px] font-black transition"
                              >
                                Users
                              </a>
                              <a
                                href={`/${t.id}/admins`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-black transition"
                              >
                                Admins
                              </a>
                              <a
                                href={`/${t.id}/manage`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[10px] font-black transition"
                              >
                                Manage
                              </a>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                                title="Edit Tenant"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTenant(t.id, t.name)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                title="Delete Tenant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs font-bold">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total Organizations</span>
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-black text-indigo-600">{tenants.length}</div>
                <p className="text-[11px] text-slate-400 font-semibold">100% Provisioned & Active</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Global MTTR</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-600">11.4 min</div>
                <p className="text-[11px] text-slate-400 font-semibold">Across all connected tenants</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>AI Parsing Accuracy</span>
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl font-black text-purple-600">99.8%</div>
                <p className="text-[11px] text-slate-400 font-semibold">Gemini 3.5 Flash Lite Engine</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>SLA Compliance</span>
                  <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="text-3xl font-black text-cyan-600">99.9%</div>
                <p className="text-[11px] text-slate-400 font-semibold">Zero critical outages</p>
              </div>
            </div>
          )}

          {/* Admins Tab */}
          {activeTab === 'admins' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-sm font-black text-slate-900">Platform Administrators (RBAC)</h2>
                <p className="text-xs text-slate-500 font-semibold">Vendor root team permissions for SmartQ</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-black">Super Admin</span>
                  <p className="text-slate-600 text-[11px]">Full control over all tenants, domain configs, billing and deletion.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black">SecOps Engineer</span>
                  <p className="text-slate-600 text-[11px]">Manage Entra SAML integration, certificates, and IAM audit logs.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-black">Support Lead</span>
                  <p className="text-slate-600 text-[11px]">Diagnose customer queues and inspect AI prompt parsing failures.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-black">Viewer</span>
                  <p className="text-slate-600 text-[11px]">Read-only access to customer analytics and SLA metrics.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Onboard / Edit Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-7 space-y-6 border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {modalMode === 'create' ? 'Onboard New Customer Organization' : 'Edit Organization Profile'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-bold">Configure tenant slug, primary domain, and default admin</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="opacity-70 hover:opacity-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block mb-1 text-slate-800">Organization / Account Name *</label>
                <input
                  type="text"
                  required
                  value={tenantFormData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTenantFormData((prev) => ({
                      ...prev,
                      name: val,
                      id: modalMode === 'create' && !prev.id ? val.toLowerCase().replace(/[^a-z0-9]/g, '') : prev.id
                    }));
                  }}
                  placeholder="e.g. Israel Electric Company (IEC)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">Tenant Route Slug *</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={tenantFormData.id}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="e.g. iec"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 disabled:bg-slate-100 text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">Primary Domain *</label>
                  <input
                    type="text"
                    required
                    value={tenantFormData.domain}
                    onChange={(e) => {
                      const domainVal = e.target.value;
                      setTenantFormData((prev) => ({
                        ...prev,
                        domain: domainVal,
                        adminEmail: modalMode === 'create' ? `admin@${domainVal}` : prev.adminEmail
                      }));
                    }}
                    placeholder="e.g. iec.co.il"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-800">Default Administrator Email</label>
                <input
                  type="email"
                  value={tenantFormData.adminEmail}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, adminEmail: e.target.value })}
                  placeholder="admin@iec.co.il"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTenant}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingTenant ? 'Provisioning...' : 'Save Organization'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}