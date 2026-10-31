import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getTenantSessionFromCookies, defaultLanding, safeReturnTo } from '@/lib/auth';
import { DEMO_TENANT } from '@/lib/constants';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function TenantLoginPage({
  params, searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { tenant: raw } = await params;
  const { returnTo, error } = await searchParams;
  const slug = raw.toLowerCase();

  const { data: tenant } = await db().from('tenants').select('id, name, status').eq('id', slug).maybeSingle();
  if (!tenant || String(tenant.status).toLowerCase() === 'suspended') notFound();

  const session = await getTenantSessionFromCookies();
  if (session && session.tenantId.toLowerCase() === slug) {
    redirect(safeReturnTo(returnTo, defaultLanding(slug, session.role)));
  }

  return <LoginForm tenant={slug} tenantName={tenant.name} returnTo={safeReturnTo(returnTo, '')} initialError={error} isDemo={slug === DEMO_TENANT} />;
}
