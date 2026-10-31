'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export interface SessionInfo {
  email: string; name: string; role: 'user' | 'admin' | 'manager'; tenantId: string;
  demo: boolean; mustChangePassword: boolean; city: string; phone: string;
}
export interface TenantInfo { id: string; name: string; domain: string }

/** Loads the signed-in user (cookie is httpOnly) and redirects to login when the session is gone. */
export function useSession(tenant: string) {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api<{ session: SessionInfo; tenant: TenantInfo }>('/api/auth/me');
      setSession(d.session);
      setTenantInfo(d.tenant);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace(`/${tenant}/login`);
    } finally {
      setLoading(false);
    }
  }, [router, tenant]);

  useEffect(() => { load(); }, [load]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace(session?.demo ? '/home' : `/${tenant}/login`);
  }, [router, tenant, session?.demo]);

  return { session, tenant: tenantInfo, loading, logout, reload: load };
}
