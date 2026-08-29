import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get('tenantSlug')?.toLowerCase();

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant identifier is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'שדות חובה חסרים (Tenant, Email, Full Name)' }, { status: 400 });
    }

    const cleanSlug = tenantSlug.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password?.trim() || 'SmartQ2026!';

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('tenant_users')
      .select('id')
      .ilike('tenant_id', cleanSlug)
      .ilike('email', cleanEmail)
      .maybeSingle();

    let resultData;
    let resultError;

    if (existingUser) {
      // Update
      const { data, error } = await supabase
        .from('tenant_users')
        .update({
          full_name: fullName.trim(),
          role: role || 'User',
          password_hash: cleanPassword,
          job_title: jobTitle?.trim() || 'Employee',
          department: department?.trim() || 'כללי',
          site_location: siteLocation?.trim() || 'מטה ראשי',
          phone_number: phoneNumber?.trim() || '',
          is_active: isActive !== undefined ? isActive : true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      resultData = data;
      resultError = error;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('tenant_users')
        .insert([
          {
            tenant_id: cleanSlug,
            email: cleanEmail,
            password_hash: cleanPassword,
            full_name: fullName.trim(),
            role: role || 'User',
            job_title: jobTitle?.trim() || 'Employee',
            department: department?.trim() || 'כללי',
            site_location: siteLocation?.trim() || 'מטה ראשי',
            phone_number: phoneNumber?.trim() || '',
            is_active: true
          }
        ])
        .select()
        .single();

      resultData = data;
      resultError = error;
    }

    if (resultError) {
      console.error('Supabase Directory Error:', resultError);
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: resultData });
  } catch (err: any) {
    console.error('Directory API catch error:', err);
    return NextResponse.json({ error: err.message || 'שגיאת שרת פנימית' }, { status: 500 });
  }
}