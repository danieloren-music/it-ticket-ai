import { notFound, redirect } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default async function TenantRootPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const rawTenant = resolvedParams?.tenant || '';
  const tenantSlug = rawTenant.toLowerCase();

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, status')
    .ilike('id', tenantSlug)
    .single();

  if (error || !tenant || tenant.status === 'suspended') {
    notFound();
  }

  // הפניה ישירה לקונסולת ה-Manage של הארגון
  redirect(`/${rawTenant}/manage`);
}