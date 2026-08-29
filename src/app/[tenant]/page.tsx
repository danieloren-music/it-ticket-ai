import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabaseClient';

export default async function TenantRootPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const rawTenant = resolvedParams?.tenant || '';
  const tenantSlug = rawTenant.toLowerCase();

  // בדיקת קיום הארגון
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, status')
    .ilike('id', tenantSlug)
    .single();

  if (error || !tenant || tenant.status === 'suspended') {
    notFound();
  }

  // בדיקת Session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('smartq_session')?.value;

  if (sessionCookie) {
    try {
      const session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
      if (session?.tenantId?.toLowerCase() === tenantSlug) {
        redirect(`/${rawTenant}/manage`);
      }
    } catch {
      // המשך ללוגין במקרה של שגיאה
    }
  }

  // הפניה אוטומטית לדף הלוגין של הארגון
  redirect(`/${rawTenant}/login?returnTo=/${rawTenant}/manage`);
}