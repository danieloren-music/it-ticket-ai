import { redirect } from 'next/navigation';

export default async function TenantRootPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  redirect(`/${resolvedParams.tenant}/users`);
}