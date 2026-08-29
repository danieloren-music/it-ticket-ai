import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get('tenantSlug') || searchParams.get('tenant') || searchParams.get('tenant_id');

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant identifier is required' }, { status: 400 });
  }

  const cleanSlug = tenantSlug.toLowerCase().trim();

  const { data, error } = await supabase
    .from('tenant_users')
    .select('*')
    .ilike('tenant_id', cleanSlug)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantSlug = body.tenantSlug || body.tenant_id || body.tenant;
    const email = body.email;
    const fullName = body.fullName || body.full_name;
    const password = body.password || body.password_hash || 'SmartQ2026!';
    const role = body.role || 'User';
    const jobTitle = body.jobTitle || body.job_title || 'Employee';
    const department = body.department || 'General';
    const siteLocation = body.siteLocation || body.site_location || 'Headquarters';
    const phoneNumber = body.phoneNumber || body.phone_number || '';
    const isActive = body.isActive !== undefined ? body.isActive : true;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant identifier is required' }, { status: 400 });
    }
    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and Full Name are required fields' }, { status: 400 });
    }

    const cleanSlug = tenantSlug.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('tenant_users')
      .select('id')
      .ilike('tenant_id', cleanSlug)
      .ilike('email', cleanEmail)
      .maybeSingle();

    let resultData;
    let resultError;

    if (existingUser) {
      const { data, error } = await supabase
        .from('tenant_users')
        .update({
          full_name: fullName.trim(),
          role,
          password_hash: password.trim(),
          job_title: jobTitle.trim(),
          department: department.trim(),
          site_location: siteLocation.trim(),
          phone_number: phoneNumber.trim(),
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      resultData = data;
      resultError = error;
    } else {
      const { data, error } = await supabase
        .from('tenant_users')
        .insert([
          {
            tenant_id: cleanSlug,
            email: cleanEmail,
            password_hash: password.trim(),
            full_name: fullName.trim(),
            role,
            job_title: jobTitle.trim(),
            department: department.trim(),
            site_location: siteLocation.trim(),
            phone_number: phoneNumber.trim(),
            is_active: isActive
          }
        ])
        .select()
        .single();

      resultData = data;
      resultError = error;
    }

    if (resultError) {
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: resultData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}