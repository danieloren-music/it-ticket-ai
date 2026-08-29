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
  Clock, 
  UserPlus, 
  Eye, 
  EyeOff,
  KeyRound
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
  status: string;
  created_at: string;
}

interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string;
  created_at: string;
}

type PlatformTab = 'tenants' | 'analytics' | 'security' | 'users';

const PLATFORM_ROLES = [
  'Super Admin',
  'Global IT Director',
  'SecOps Lead',
  'Cloud Infrastructure Architect',
  'Lead Support Engineer',
  'Compliance & IAM Auditor',
  'Read-Only Viewer'
];

export default function PlatformMasterConsole() {
  const [activeTab, setActiveTab] = useState<PlatformTab>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Tenant Modal State
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantModalMode, setTenantModalMode] = useState<'create' | 'edit'>('create');
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({
    id: '',
    name: '',
    domain: '',
    adminEmail: '',
    status: 'Active'
  });

  // Platform User Modal State (Add / Edit)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [savingUser, setSavingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Super Admin',
    department: 'Cloud Operations'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, adminsRes] = await Promise.all([
        fetch('/api/platform/tenants'),
        fetch('/api/platform/admins')
      ]);

      const tenantsData = await tenantsRes.json();
      const adminsData = await adminsRes.json();

      if (tenantsData.tenants) setTenants(tenantsData.tenants);
      if (adminsData.admins) setPlatformUsers(adminsData.admins);
    } catch (err) {
      console.error('Error fetching platform data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateTenantModal = () => {
    setTenantModalMode('create');
    setTenantFormData({
      id: '',
      name: '',
      domain: '',
      adminEmail: '',
      status: 'Active'
    });
    setIsTenantModalOpen(true);
  };

  const handleOpenEditTenantModal = (t: Tenant) => {
    setTenantModalMode('edit');
    setTenantFormData({
      id: t.id,
      name: t.name,
      domain: t.domain,
      adminEmail: t.admin_email,
      status: t.status || 'Active'
    });
    setIsTenantModalOpen(true);
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

      setIsTenantModalOpen(false);
      fetchData();
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
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenCreateUserModal = () => {
    setUserModalMode('create');
    setUserFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Super Admin',
      department: 'Cloud Operations'
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: PlatformUser) => {
    setUserModalMode('edit');
    const nameParts = u.full_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    setUserFormData({
      firstName,
      lastName,
      email: u.email,
      password: '',
      role: u.role || 'Super Admin',
      department: u.department || 'Cloud Operations'
    });
    setIsUserModalOpen(true);
  };

  const handleSavePlatformUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.email || !userFormData.firstName) return;
    setSavingUser(true);

    try {
      const fullName = `${userFormData.firstName.trim()} ${userFormData.lastName.trim()}`.trim();
      const res = await fetch('/api/platform/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userFormData.email,
          fullName,
          password: userFormData.password || (userModalMode === 'create' ? 'SmartQ2026!' : undefined),
          role: userFormData.role,
          department: userFormData.department
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save platform user');

      setIsUserModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSavingUser(false);
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
            <span className="text-slate-800">Vendor Master Fabric</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1 rounded-md text-[11px] font-black tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>Root Admin</span>
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

      {/* Main Content Layout */}
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
              onClick={() => setActiveTab('users')}
              className={`p-2.5 rounded-xl transition ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Platform Users & RBAC"
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
                <span>
                  {activeTab === 'tenants' && 'Organizations & Customer Environments'}
                  {activeTab === 'analytics' && 'Vendor Cloud Telemetry & Metrics'}
                  {activeTab === 'security' && 'Global Security & Compliance Policies'}
                  {activeTab === 'users' && 'Platform Users (Backend Root RBAC)'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Centralized multi-tenant management, root administrators, and infrastructure monitoring
              </p>
            </div>

            {activeTab === 'tenants' && (
              <button
                type="button"
                onClick={handleOpenCreateTenantModal}
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
                                href={`/${t.id}/self-service`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[10px] font-black transition"
                              >
                                SelfService
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
                                onClick={() => handleOpenEditTenantModal(t)}
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

          {/* Platform Users Tab (Backend Users RBAC) */}
          {activeTab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Platform Users & Identity Access</h2>
                  <p className="text-xs text-slate-500 font-semibold">Vendor root team identities for SmartQ platform</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateUserModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ New User</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black">
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Platform Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Access Level</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold bg-white">
                    {platformUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-black text-slate-900">{u.full_name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{u.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{u.department || 'Cloud Operations'}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Authorized
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenEditUserModal(u)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition"
                            title="Edit User & Credentials"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                <p className="text-[11px] text-slate-400 font-semibold">Gemini Flash Engine</p>
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

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-sm font-black text-slate-900">Global Security & Compliance Policies</h2>
                <p className="text-xs text-slate-500 font-semibold">Tenant isolation, RBAC policies, and encryption rules</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-black text-slate-900">Tenant Isolation (RLS)</span>
                  <p className="text-slate-600 text-[11px]">Strict multi-tenancy logical isolation enforced on all DB queries.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-black text-slate-900">SAML 2.0 & Entra ID</span>
                  <p className="text-slate-600 text-[11px]">Identity federation via industry-standard X.509 assertion tokens.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-black text-slate-900">Audit Trail Logging</span>
                  <p className="text-slate-600 text-[11px]">Immutable session tracking across all administrative endpoints.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL: ONBOARD / EDIT TENANT */}
      {isTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-7 space-y-6 border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {tenantModalMode === 'create' ? 'Onboard New Customer Organization' : 'Edit Organization Profile'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-bold">Configure tenant slug, primary domain, and default admin</p>
                </div>
              </div>
              <button onClick={() => setIsTenantModalOpen(false)} className="opacity-70 hover:opacity-100 p-1">
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
                      id: tenantModalMode === 'create' && !prev.id ? val.toLowerCase().replace(/[^a-z0-9]/g, '') : prev.id
                    }));
                  }}
                  placeholder="e.g. Rafael Advanced Defense Systems"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">Tenant Route Slug *</label>
                  <input
                    type="text"
                    required
                    disabled={tenantModalMode === 'edit'}
                    value={tenantFormData.id}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="e.g. rafael"
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
                        adminEmail: tenantModalMode === 'create' ? `admin@${domainVal}` : prev.adminEmail
                      }));
                    }}
                    placeholder="e.g. rafael.co.il"
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
                  placeholder="admin@rafael.co.il"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTenantModalOpen(false)}
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

      {/* MODAL: ADD / EDIT PLATFORM USER */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-7 space-y-6 border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {userModalMode === 'create' ? 'Add New Platform User' : 'Edit Platform User & Role'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-bold">Assign vendor backend credentials and permission tier</p>
                </div>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="opacity-70 hover:opacity-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlatformUser} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">First Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    placeholder="e.g. Daniel"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    placeholder="e.g. Oren"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-800">Platform Email *</label>
                <input
                  type="email"
                  required
                  disabled={userModalMode === 'edit'}
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="user@smartq.ai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 disabled:bg-slate-100 text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">
                    {userModalMode === 'edit' ? 'Reset Password (Optional)' : 'Master Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder={userModalMode === 'edit' ? 'Leave empty to keep current' : 'Default: SmartQ2026!'}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">Platform Permission Role *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-black focus:outline-none focus:border-indigo-600"
                  >
                    {PLATFORM_ROLES.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-800">Department</label>
                <input
                  type="text"
                  value={userFormData.department}
                  onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                  placeholder="e.g. Cloud Operations / SecOps"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingUser ? 'Saving...' : userModalMode === 'edit' ? 'Update User' : 'Save Platform User'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}