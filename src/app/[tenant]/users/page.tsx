'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function UsersRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const rawTenant = (params?.tenant as string) || '';

  useEffect(() => {
    if (rawTenant) {
      router.replace(`/${rawTenant}/new-request`);
    }
  }, [rawTenant, router]);

  return <div className="min-h-screen bg-[#F8FAFC]" />;
}