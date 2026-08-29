'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
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
  EyeOff,
  Edit2,
  Trash2,
  AtSign,
  Plus,
  Layers,
  Sparkles,
  LogOut,
  CheckCircle2
} from 'lucide-react';

type LanguageMode = 'he' | 'en';
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

interface SecurityGroup {
  id: string;
  name: string;
  role: 'User' | 'Admin' | 'Manager';
  description: string;
}

function ManageConsoleContent() {
  const router = useRouter();
  const [lang, setLang] = useState<LanguageMode>('en');
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase().trim();

  const [tenantDomain, setTenantDomain] = useState(`${tenantSlug}.co.il`);
  const [tenantName, setTenantName] = useState(rawTenant.toUpperCase());

  const [activeNav, setActiveNav] = useState<RadwareNav>('directory');
  const [subTab, setSubTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Current Manager Session
  const [currentManager, setCurrentManager] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: 'Administrator',
    email: `admin@${tenantSlug}.co.il`,
    role: 'Manager'
  });

  // Profile Edit Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [showProfilePass, setShowProfilePass] = useState(false);

  // User Add / Edit Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [savingUser, setSavingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    role: 'User' as 'User' | 'Admin' | 'Manager',
    jobTitle: 'Enterprise Staff',
    department: 'Operations',
    siteLocation: 'Headquarters',
    phoneNumber: ''
  });

  // Security Groups State
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>([
    { id: '1', name: 'Managers Group', role: 'Manager', description: 'Full tenant control over manage console, directory users and integrations.' },
    { id: '2', name: 'IT Admins Group', role: 'Admin', description: 'Access to IT Queue desk, technician assignment, and ticket resolution.' },
    { id: '3', name: 'Corporate Staff Group', role: 'User', description: 'Authorized to dispatch self-service tickets via Tony AI.' }
  ]);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRole, setNewGroupRole] = useState<'User' | 'Admin' | 'Manager'>('User');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  useEffect(() => {
    const fetchTenantInfo = async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .ilike('id', tenantSlug)
        .maybeSingle();

      if (data) {
        if (data.domain) setTenantDomain(data.domain);
        if (data.name) setTenantName(data.name);
      }
    };

    fetchTenantInfo();
  }, [tenantSlug]);

  useEffect(() => {
    const matchCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('smartq_session='));

    if (matchCookie) {
      try {
        const rawVal = matchCookie.split('=')[1];
        const decoded = JSON.parse(atob(rawVal));
        if (decoded.email) {
          setCurrentManager({
            name: decoded.name || decoded.email.split('@')[0],
            email: decoded.email,
            role: decoded.role || 'Manager'
          });
        }
      } catch {}
    }
  }, []);

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
            email: `admin@${tenantDomain}`,
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
  }, [tenantSlug, tenantDomain]);

  const handleOpenCreateUser = () => {
    setUserModalMode('create');
    setUserFormData({
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      role: 'User',
      jobTitle: 'Enterprise Staff',
      department: 'Operations',
      siteLocation: 'Headquarters',
      phoneNumber: ''
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: DirectoryUser) => {
    setUserModalMode('edit');
    const nameParts = u.full_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const username = u.email.split('@')[0];

    setUserFormData({
      firstName,
      lastName,
      username,
      password: '',
      role: u.role,
      jobTitle: u.job_title || 'Enterprise Staff',
      department: u.department || 'Operations',
      siteLocation: u.site_location || 'Headquarters',
      phoneNumber: u.phone_number || ''
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username || !userFormData.firstName) return;
    setSavingUser(true);

    const cleanUsername = userFormData.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const fullEmail = `${cleanUsername}@${tenantDomain}`;
    const fullName = `${userFormData.firstName.trim()} ${userFormData.lastName.trim()}`.trim();

    try {
      const res = await fetch('/api/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          email: fullEmail,
          fullName,
          password: userFormData.password || (userModalMode === 'create' ? 'SmartQ2026!' : undefined),
          role: userFormData.role,
          jobTitle: userFormData.jobTitle,
          department: userFormData.department,
          siteLocation: userFormData.siteLocation,
          phoneNumber: userFormData.phoneNumber
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save directory user');

      setIsUserModalOpen(false);
      fetchDirectory();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (u: DirectoryUser) => {
    if (u.email.toLowerCase() === currentManager.email.toLowerCase()) {
      alert(isHebrew ? 'לא ניתן למחוק את החשבון המחובר הנוכחי.' : 'You cannot delete your own active administrator account.');
      return;
    }

    if (!confirm(isHebrew ? `למחוק את המשתמש "${u.full_name}" (${u.email})?` : `Are you sure you want to delete user "${u.full_name}" (${u.email})?`)) return;

    try {
      const res = await fetch(`/api/directory?tenantSlug=${tenantSlug}&email=${encodeURIComponent(u.email)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchDirectory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSecurityGroups([
      ...securityGroups,
      {
        id: Date.now().toString(),
        name: newGroupName.trim(),
        role: newGroupRole,
        description: newGroupDesc.trim() || 'Custom security policy group'
      }
    ]);
    setNewGroupName('');
    setNewGroupDesc('');
    setIsAddGroupOpen(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSavedSuccess(false);

    try {
      const res = await fetch('/api/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          email: currentManager.email,
          fullName: currentManager.name,
          role: currentManager.role,
          password: profilePassword || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to update profile');

      setProfileSavedSuccess(true);
      fetchDirectory();
      setTimeout(() => {
        setProfileSavedSuccess(false);
        setIsProfileModalOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'smartq_session=; path=/; max-age=0; SameSite=Lax';
    router.push(`/${rawTenant}/login`);
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

  const getInitials = (name: string) => {
    if (!name) return 'MG';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isHebrew = lang === 'he';

  return (
    <div dir={isHebrew ? 'rtl' : 'ltr'} className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased select-none">
      
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm hover:shadow-md transition">
              <Image src="/smartq-logo.png" alt="SmartQ" width={38} height={38} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-slate-950">SmartQ</span>
              <span className="text-slate-300 text-lg font-bold">/</span>
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {rawTenant}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span className="uppercase">{tenantName} {isHebrew ? 'ניהול' : 'MANAGEMENT'}</span>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>SLA Target: 99.8% Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Language Switcher Capsule */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-black">
            <button
              onClick={() => setLang('he')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                isHebrew ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇮🇱</span>
              <span>עברית</span>
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                !isHebrew ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇺🇸</span>
              <span>EN</span>
            </button>
          </div>

          <a
            href={`/${rawTenant}/admins`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black border border-slate-200 transition"
          >
            <span>{isHebrew ? 'תור קריאות IT' : 'IT Queue'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* User Profile Avatar */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="group flex items-center gap-2.5 p-1 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition text-left"
            title="Edit Manager Profile"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 group-hover:bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs transition">
              {getInitials(currentManager.name)}
            </div>
            <div className="hidden lg:block px-2">
              <span className="block text-xs font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition">
                {currentManager.name}
              </span>
              <span className="block text-[10px] font-bold text-slate-500 leading-tight">
                {currentManager.email}
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-14 bg-[#1E293B] border-r border-slate-800 text-slate-300 flex flex-col items-center py-4 justify-between shrink-0 z-30">
          <div className="space-y-4 w-full flex flex-col items-center">
            <button
              onClick={() => setActiveNav('directory')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'directory' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title={isHebrew ? 'משתמשים וזהויות' : 'Identity & Directory'}
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('overview')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title={isHebrew ? 'סקירה וטלמטריה' : 'Telemetry Overview'}
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('protection')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'protection' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title={isHebrew ? 'מדיניות ניתוב' : 'Routing Policies'}
            >
              <Shield className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('sso')}
              className={`p-2.5 rounded-xl transition ${activeNav === 'sso' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
              title={isHebrew ? 'אינטגרציית SSO' : 'Entra SAML SSO'}
            >
              <KeyRound className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 flex flex-col items-center">
            <button onClick={() => setIsProfileModalOpen(true)} className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h1 className="text-lg font-black text-slate-900">
                {activeNav === 'directory' 
                  ? (isHebrew ? 'ניהול זהויות, משתמשים והרשאות (Directory)' : 'Identity & Access Directory') 
                  : (isHebrew ? 'מרכז בקרה וטלמטריה' : 'Management & Telemetry Console')}
              </h1>
              <span className="text-xs font-bold text-slate-500">
                {isHebrew ? 'ארגון: ' : 'Tenant: '} {tenantName} ({tenantDomain})
              </span>
            </div>

            {activeNav === 'directory' && subTab === 'users' && (
              <button
                type="button"
                onClick={handleOpenCreateUser}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isHebrew ? '+ הוסף משתמש ארגוני' : '+ Add Directory User'}</span>
              </button>
            )}

            {activeNav === 'directory' && subTab === 'groups' && (
              <button
                type="button"
                onClick={() => setIsAddGroupOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isHebrew ? '+ קבוצת אבטחה חדשה' : '+ New Security Group'}</span>
              </button>
            )}
          </div>

          {/* Directory Module View */}
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
                    {isHebrew ? `משתמשי ארגון (${users.length})` : `Directory Users (${users.length})`}
                  </button>
                  <button
                    onClick={() => setSubTab('groups')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      subTab === 'groups' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700'
                    }`}
                  >
                    {isHebrew ? `קבוצות אבטחה (${securityGroups.length})` : `Security Groups (${securityGroups.length})`}
                  </button>
                </div>

                {subTab === 'users' && (
                  <div className="relative w-72">
                    <Search className={`w-4 h-4 absolute ${isHebrew ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isHebrew ? 'חפש לפי שם, אימייל או מטה...' : 'Search by name, email or HQ...'}
                      className={`w-full ${isHebrew ? 'pr-9 pl-3.5' : 'pl-9 pr-3.5'} py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-indigo-600`}
                    />
                  </div>
                )}
              </div>

              {subTab === 'users' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className={`w-full ${isHebrew ? 'text-right' : 'text-left'} text-xs`}>
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black">
                        <th className="py-3 px-4">{isHebrew ? 'שם מלא' : 'Full Name'}</th>
                        <th className="py-3 px-4">{isHebrew ? 'אימייל ארגוני' : 'Corporate Email'}</th>
                        <th className="py-3 px-4">{isHebrew ? 'הרשאה / תפקיד' : 'Role Assignment'}</th>
                        <th className="py-3 px-4">{isHebrew ? 'מחלקה וסניף' : 'Department & Campus'}</th>
                        <th className="py-3 px-4">{isHebrew ? 'סטטוס' : 'Status'}</th>
                        <th className="py-3 px-4 text-center">{isHebrew ? 'פעולות' : 'Actions'}</th>
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
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition"
                                title="Edit User"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                title="Delete User"
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

              {subTab === 'groups' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  {securityGroups.map((g) => (
                    <div key={g.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                      <div className="font-black text-slate-900 flex items-center justify-between">
                        <span>{g.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                          g.role === 'Manager' ? 'bg-purple-100 text-purple-800' :
                          g.role === 'Admin' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-slate-200 text-slate-800'
                        }`}>
                          {g.role}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{g.description}</p>
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>
                          {users.filter(u => u.role === g.role).length} {isHebrew ? 'משתמשים משויכים' : 'Members Assigned'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {activeNav === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="font-black text-slate-900 flex items-center justify-between">
                  <span>{isHebrew ? 'קריאות היום' : 'Tickets Today'}</span>
                  <Activity className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-black text-indigo-600">24</div>
                <p className="text-[11px] text-slate-500">{isHebrew ? '100% נותבו אוטומטית' : '100% routed automatically'}</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="font-black text-slate-900 flex items-center justify-between">
                  <span>{isHebrew ? 'זמן מענה ממוצע (MTTR)' : 'Average MTTR'}</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-600">12 min</div>
                <p className="text-[11px] text-slate-500">{isHebrew ? 'עמידה ביעד SLA: 99.4%' : 'SLA target compliance: 99.4%'}</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="font-black text-slate-900 flex items-center justify-between">
                  <span>{isHebrew ? 'זהויות פעילות ב-Directory' : 'Directory Active Identities'}</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl font-black text-purple-600">{users.length}</div>
                <p className="text-[11px] text-slate-500">{isHebrew ? 'מסונכרן מקומית וב-Entra ID' : 'Synchronized locally & Entra ID'}</p>
              </div>
            </div>
          )}

          {activeNav === 'protection' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xs text-xs">
              <h2 className="text-sm font-black text-slate-900">{isHebrew ? 'מדיניות ניתוב תורים' : 'Queue Dispatch Policies'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-800">Hardware & Peripherals</span>
                  <p className="text-slate-500">Tier 1 Helpdesk Queue</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-800">IAM & VPN Access</span>
                  <p className="text-slate-500">Security & Systems Queue</p>
                </div>
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
                  {isHebrew ? 'סנכרון קבוצות וזהויות מול Azure / Entra' : 'Automated security group claim matching and identity assertion'}
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

      {/* MODAL: ADD / EDIT DIRECTORY USER (עם דומיין נעול) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-7 space-y-6 border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {userModalMode === 'create' 
                      ? (isHebrew ? 'הוספת משתמש חדש ל-Directory' : 'Add New Directory Identity')
                      : (isHebrew ? 'עריכת משתמש ב-Directory' : 'Edit Directory User')}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-bold">
                    {isHebrew ? 'הקצאת חשבון ארגוני תחת הדומיין המאומת' : 'Assign corporate role, credentials, and office site'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="opacity-70 hover:opacity-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">{isHebrew ? 'שם פרטי *' : 'First Name *'}</label>
                  <input
                    type="text"
                    required
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    placeholder={isHebrew ? 'למשל: רבקה' : 'e.g. Rivka'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">{isHebrew ? 'שם משפחה *' : 'Last Name *'}</label>
                  <input
                    type="text"
                    required
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    placeholder={isHebrew ? 'למשל: ארדין' : 'e.g. Ardin'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
              </div>

              {/* Username Input with Locked Tenant Domain */}
              <div>
                <label className="block mb-1 text-slate-800">{isHebrew ? 'שם משתמש ארגוני (Username) *' : 'Corporate Identity (Username) *'}</label>
                <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                  <div className="px-3 text-slate-400">
                    <AtSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={userModalMode === 'edit'}
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                    placeholder="username"
                    className="w-full py-2.5 bg-transparent text-slate-900 font-mono font-bold focus:outline-none disabled:text-slate-500"
                  />
                  <div className="px-3.5 py-2.5 bg-indigo-50 border-x border-slate-300 text-indigo-700 font-mono font-black select-none text-xs">
                    @{tenantDomain}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">
                    {userModalMode === 'edit' ? (isHebrew ? 'איפוס סיסמה (אופציונלי)' : 'Reset Password (Optional)') : (isHebrew ? 'סיסמה ראשונית *' : 'Initial Password *')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder={userModalMode === 'edit' ? (isHebrew ? 'השאר ריק כדי לשמור קיימת' : 'Leave empty to keep') : 'Default: SmartQ2026!'}
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
                  <label className="block mb-1 text-slate-800">{isHebrew ? 'תפקיד / הרשאה' : 'Role Permission'}</label>
                  <select
                    value={userFormData.role}
                    onChange={(e: any) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-black focus:outline-none focus:border-indigo-600"
                  >
                    <option value="User">User (Self-Service Access)</option>
                    <option value="Admin">Admin (IT Desk Operator)</option>
                    <option value="Manager">Manager (Full Tenant Administrator)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1 text-slate-800">{isHebrew ? 'מחלקה' : 'Department'}</label>
                  <input
                    type="text"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    placeholder={isHebrew ? 'למשל: תפעול והנדסה' : 'e.g. Engineering & DevOps'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">{isHebrew ? 'סניף / מטה' : 'Campus / Office Site'}</label>
                  <input
                    type="text"
                    value={userFormData.siteLocation}
                    onChange={(e) => setUserFormData({ ...userFormData, siteLocation: e.target.value })}
                    placeholder={isHebrew ? 'למשל: מטה חיפה' : 'e.g. Haifa Campus'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  {isHebrew ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingUser ? (isHebrew ? 'שומר...' : 'Saving...') : userModalMode === 'edit' ? (isHebrew ? 'עדכן משתמש' : 'Update User') : (isHebrew ? 'שמור משתמש' : 'Save User')}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: ADD SECURITY GROUP */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl p-7 space-y-5 border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-black text-slate-900">{isHebrew ? 'הקמת קבוצת אבטחה חדשה' : 'Create Security Group'}</h2>
              <button onClick={() => setIsAddGroupOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block mb-1">{isHebrew ? 'שם הקבוצה *' : 'Group Name *'}</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. NOC Operations Tier 2"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-1">{isHebrew ? 'הרשאת בסיס' : 'Base Role Policy'}</label>
                <select
                  value={newGroupRole}
                  onChange={(e: any) => setNewGroupRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none font-bold"
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">{isHebrew ? 'תיאור הקבוצה' : 'Description'}</label>
                <textarea
                  rows={2}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Description of group scope..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddGroupOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700">
                  {isHebrew ? 'ביטול' : 'Cancel'}
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-sm">
                  {isHebrew ? 'צור קבוצה' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MANAGER PROFILE */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl p-7 space-y-6 border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {getInitials(currentManager.name)}
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">{isHebrew ? 'פרופיל מנהל מערכת' : 'Tenant Administrator Profile'}</h2>
                  <p className="text-[11px] text-slate-500 font-bold">{currentManager.email}</p>
                </div>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            {profileSavedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isHebrew ? 'הפרופיל עודכן בהצלחה!' : 'Profile updated successfully!'}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block mb-1">{isHebrew ? 'שם מלא *' : 'Full Name *'}</label>
                <input
                  type="text"
                  required
                  value={currentManager.name}
                  onChange={(e) => setCurrentManager({ ...currentManager, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50"
                />
              </div>

              <div>
                <label className="block mb-1">{isHebrew ? 'סיסמה חדשה (אופציונלי)' : 'New Password (Optional)'}</label>
                <div className="relative">
                  <input
                    type={showProfilePass ? 'text' : 'password'}
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                  <button type="button" onClick={() => setShowProfilePass(!showProfilePass)} className="absolute right-3 top-2.5 text-slate-400">
                    {showProfilePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-black flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isHebrew ? 'התנתק' : 'Sign Out'}</span>
                </button>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 border rounded-xl">
                    {isHebrew ? 'ביטול' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={profileSaving} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-black">
                    {profileSaving ? (isHebrew ? 'שומר...' : 'Saving...') : (isHebrew ? 'שמור' : 'Save')}
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

export default function TenantManagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <ManageConsoleContent />
    </Suspense>
  );
}