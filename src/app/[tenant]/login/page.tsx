import { notFound, redirect } from 'next/navigation';
import { db, must } from '@/lib/db';
import { getTenantSessionFromCookies, defaultLanding, normalizeRole, safeReturnTo } from '@/lib/auth';
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

  const tenant = must(await db().from('tenants').select('id, name, status').eq('id', slug).maybeSingle());
  if (!tenant || String(tenant.status).toLowerCase() === 'suspended') notFound();

  const ssoSettings = slug === DEMO_TENANT
    ? null
    : must(await db().from('tenant_settings').select('saml_enabled, oidc_enabled').eq('tenant_id', slug).maybeSingle());
  const session = await getTenantSessionFromCookies();
  let sessionError: string | undefined;
  if (session && session.tenantId.toLowerCase() === slug) {
    let active = Boolean(session.demo);
    let role = session.role;
    if (!session.demo) {
      const user = must(
        await db()
          .from('tenant_users')
          .select('role, is_active')
          .eq('tenant_id', session.tenantId)
          .eq('email', session.sub)
          .maybeSingle()
      );
      active = Boolean(user && user.is_active !== false);
      if (!user) sessionError = session.authSource === 'sso' ? 'account_not_provisioned' : 'account_disabled';
      else if (user.is_active === false) sessionError = 'account_disabled';
      if (user) role = normalizeRole(user.role);
    }
    if (active) redirect(safeReturnTo(returnTo, defaultLanding(slug, role)));
  }

  const initialError = error || sessionError;
  return (
    <LoginForm
      tenant={slug}
      tenantName={tenant.name}
      returnTo={safeReturnTo(returnTo, '')}
      initialError={initialError}
      isDemo={slug === DEMO_TENANT}
      ssoProviders={{ saml: Boolean(ssoSettings?.saml_enabled), oidc: Boolean(ssoSettings?.oidc_enabled) }}
    />
  );
}
