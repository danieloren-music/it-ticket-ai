'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Building2, 
  Users, 
  Search, 
  ExternalLink, 
  X, 
  Save, 
  UserPlus, 
  BarChart3, 
  KeyRound, 
  Shield, 
  Activity, 
  Settings, 
  AlertTriangle, 
  Clock, 
  Eye, 
  EyeOff 
} from 'lucide-react';

type RadwareNav = 'directory' | 'overview' | 'protection' | 'sso';

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
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase().trim();

  const [activeNav, setActiveNav] = useState<RadwareNav>('directory');
  const [subTab, setSubTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'User' as 'User' | 'Admin' | 'Manager',
    jobTitle: 'Enterprise Staff',
    department: 'Operations',
    siteLocation: 'Headquarters',
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
            full_name: 'Lead System Administrator',
            role: 'Manager',
            department: 'IT & Security',
            site_location: 'Central Campus',
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
          tenantSlug: tenantSlug || rawTenant,
          tenant_id: tenantSlug || rawTenant,
          ...newUserData
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save directory user');

      setIsAddUserOpen(false);
      setNewUserData({
        fullName: '',
        email: '',
        password: '',
        role: 'User',
        jobTitle: 'Enterprise Staff',
        department: 'Operations',
        siteLocation: 'Headquarters',
        phoneNumber: ''
      });
      fetchDirectory();
    } catch (err: any) {
      alert('Error: ' + err.message);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased select-none">
      
      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1 shadow-2xs">
              <Image src="/smartq-logo.png" alt="SmartQ" width={28} height={28} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="text-indigo-600 font-black text-sm">SmartQ</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-extrabold uppercase">{rawTenant}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-800">{rawTenant.toUpperCase()} MANAGEMENT</span>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>SLA Target: 99.8% Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/${rawTenant}/admins`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-black border border-slate-200 transition"
          >
            <span>IT Queue</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            MG
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-14 bg-[#1E293B] border-r border-slate-800 text-slate-300 flex flex-col items-center py-4 justify-between shrink-0 z-30">
          <div className="space-y-4 w-full flex flex-col items-center">
            <button
              onClick={() => setActiveNav('directory')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'directory' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Identity & Directory"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('overview')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Telemetry Overview"
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('protection')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'protection' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Routing Policies"
            >
              <Shield className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('sso')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'sso' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title="Entra SAML SSO"
            >
              <KeyRound className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 flex flex-col items-center">
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h1 className="text-lg font-black text-slate-900">
                {activeNav === 'directory' ? 'Identity & Access Directory' : 'Management & Telemetry Console'}
              </h1>
              <span className="text-xs font-bold text-slate-500">Tenant: {rawTenant}</span>
            </div>

            {activeNav === 'directory' && (
              <button
                type="button"
                onClick={() => setIsAddUserOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Directory User</span>
              </button>
            )}
          </div>

          {/* Directory Tab View */}
          {activeNav === 'directory' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-black">
                  <button
                    onClick={() => setSubTab('users')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      subTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700'
                    }`}
                  >
                    Directory Users ({users.length})
                  </button>
                  <button
                    onClick={() => setSubTab('groups')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      subTab === 'groups' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700'
                    }`}
                  >
                    Security Groups
                  </button>
                </div>

                <div className="relative w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email or HQ..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {subTab === 'users' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black">
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Corporate Email</th>
                        <th className="py-3 px-4">Role Assignment</th>
                        <th className="py-3 px-4">Department & Campus</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold bg-white">
                      {filteredUsers.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-black text-slate-900">
                            {u.full_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-mono font-bold">
                            {u.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                              u.role === 'Manager' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                              u.role === 'Admin' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                              'bg-slate-100 text-slate-800 border border-slate-300'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {u.department || 'General'} • {u.site_location || 'Headquarters'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700">
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

              {subTab === 'groups' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="font-black text-slate-900 flex items-center justify-between">
                      <span>Managers Group</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-black">Managers</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">Full control over manage console, directory users and integrations.</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="font-black text-slate-900 flex items-center justify-between">
                      <span>IT Admins Group</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">Admins</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">Access to IT Queue desk, assignee updates, and ticket resolution.</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="font-black text-slate-900 flex items-center justify-between">
                      <span>Corporate Staff</span>
                      <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-black">Users</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">Authorized to create and dispatch service requests via Zack AI.</p>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeNav === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="font-black text-slate-900 flex items-center justify-between">
                  <span>Tickets Today</span>
                  <Activity className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-black text-indigo-600">24</div>
                <p className="text-[11px] text-slate-500">100% routed automatically</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="font-black text-slate-900 flex items-center justify-between">
                  <span>Average MTTR</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-600">12 min</div>
                <p className="text-[11px] text-slate-500">SLA target compliance: 99.4%</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="font-black text-slate-900 flex items-center justify-between">
                  <span>Directory Active Identities</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl font-black text-purple-600">{users.length}</div>
                <p className="text-[11px] text-slate-500">Synchronized locally & Entra ID</p>
              </div>
            </div>
          )}

          {activeNav === 'sso' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Microsoft Entra ID (SAML 2.0 Single Sign-On)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Automated security group claim matching and identity assertion
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold text-slate-500">Identifier (Entity ID)</span>
                  <div className="font-mono text-indigo-600 font-bold break-all">https://it-ticket-ai-beige.vercel.app/api/auth/saml/metadata</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold text-slate-500">Reply URL (Assertion Consumer Service)</span>
                  <div className="font-mono text-indigo-600 font-bold break-all">https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback</div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ADD ENTERPRISE USER MODAL WITH PASSWORD MASKING */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-7 space-y-6 border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Add New Directory Identity</h2>
                  <p className="text-[11px] text-slate-500 font-bold">Assign corporate role, credentials, and office site</p>
                </div>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="opacity-70 hover:opacity-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    placeholder="e.g. Rivka Ardin"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder={`user@${tenantSlug || 'company'}.co.il`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">Initial Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      placeholder="Default: SmartQ2026!"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
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
                  <label className="block mb-1 text-slate-800">Role Permission</label>
                  <select
                    value={newUserData.role}
                    onChange={(e: any) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-black"
                  >
                    <option value="User">User (Self-Service Access)</option>
                    <option value="Admin">Admin (IT Desk Operator)</option>
                    <option value="Manager">Manager (Full Tenant Administrator)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">Department</label>
                  <input
                    type="text"
                    value={newUserData.department}
                    onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    placeholder="e.g. Engineering & DevOps"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">Campus / Office Site</label>
                  <input
                    type="text"
                    value={newUserData.siteLocation}
                    onChange={(e) => setNewUserData({ ...newUserData, siteLocation: e.target.value })}
                    placeholder="e.g. Haifa Campus"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
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
                  <span>{savingUser ? 'Saving...' : 'Save User to Directory'}</span>
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