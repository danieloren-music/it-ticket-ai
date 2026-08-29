import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// שליפת רשימת משתמשי הארגון
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get('tenantSlug')?.toLowerCase();

  if (!tenantSlug) {
    return NextResponse.json({ error: 'חסר מזהה ארגון' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tenant_users')
    .select('*')
    .ilike('tenant_id', tenantSlug)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data || [] });
}

// יצירת / עדכון משתמש ארגוני
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      tenantSlug, 
      email, 
      password, 
      fullName, 
      role, 
      jobTitle, 
      department, 
      siteLocation, 
      phoneNumber,
      isActive 
    } = body;

    if (!tenantSlug || !email || !fullName) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 });
    }

    const cleanSlug = tenantSlug.toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const userPassword = password?.trim() || 'SmartQ2026!';
    const userRole = role || 'User';

    const { data, error } = await supabase
      .from('tenant_users')
      .upsert({
        tenant_id: cleanSlug,
        email: cleanEmail,
        password_hash: userPassword,
        full_name: fullName.trim(),
        role: userRole,
        job_title: jobTitle?.trim() || 'Employee',
        department: department?.trim() || 'General',
        site_location: siteLocation?.trim() || 'מטה ראשי',
        phone_number: phoneNumber?.trim() || '',
        is_active: isActive !== undefined ? isActive : true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,email' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}