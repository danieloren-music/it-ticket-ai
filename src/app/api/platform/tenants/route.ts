import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// שליפת כל הארגונים + סטטיסטיקות
export async function GET() {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ tenants: tenants || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// יצירה או עדכון ארגון
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, domain, adminEmail, status } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Account ID/Slug and Name are required' }, { status: 400 });
    }

    const cleanSlug = id.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    const cleanDomain = domain ? domain.toLowerCase().trim() : `${cleanSlug}.com`;
    const resolvedAdminEmail = adminEmail ? adminEmail.toLowerCase().trim() : `admin@${cleanDomain}`;

    const { data: tenant, error } = await supabase
      .from('tenants')
      .upsert({
        id: cleanSlug,
        name: name.trim(),
        domain: cleanDomain,
        primary_domain: cleanDomain,
        admin_email: resolvedAdminEmail,
        status: status || 'Active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    // יצירת/עדכון משתמש Manager ראשי לארגון
    await supabase
      .from('tenant_users')
      .upsert({
        tenant_id: cleanSlug,
        email: resolvedAdminEmail,
        password_hash: 'SmartQ2026!',
        full_name: `Administrator (${name.trim()})`,
        role: 'Manager',
        department: 'IT & Cloud Operations',
        site_location: 'Headquarters',
        is_active: true
      }, { onConflict: 'tenant_id,email' });

    return NextResponse.json({ success: true, tenant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// מחיקת ארגון
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.toLowerCase().trim();

    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // מחיקת קריאות, משתמשים וארגון
    await supabase.from('tickets').delete().eq('tenant_id', id);
    await supabase.from('tenant_users').delete().eq('tenant_id', id);
    const { error } = await supabase.from('tenants').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}