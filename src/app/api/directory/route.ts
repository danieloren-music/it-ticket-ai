import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

function extractTenant(req: NextRequest, body?: any): string | null {
  const { searchParams } = new URL(req.url);
  const fromQuery = searchParams.get('tenantSlug') || searchParams.get('tenant') || searchParams.get('tenant_id');
  if (fromQuery) return fromQuery.toLowerCase().trim();

  if (body) {
    const fromBody = body.tenantSlug || body.tenant_id || body.tenant;
    if (fromBody) return String(fromBody).toLowerCase().trim();
  }

  const sessionCookie = req.cookies.get('smartq_session')?.value;
  if (sessionCookie) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
      if (decoded.tenantId) return String(decoded.tenantId).toLowerCase().trim();
    } catch {}
  }

  return null;
}

export async function GET(req: NextRequest) {
  const tenantSlug = extractTenant(req);

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
    const tenantSlug = extractTenant(req, body);

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant identifier is required' }, { status: 400 });
    }

    const email = body.email;
    const fullName = body.fullName || body.full_name;
    const password = body.password || body.password_hash || 'SmartQ2026!';
    const role = body.role || 'User';
    const jobTitle = body.jobTitle || body.job_title || 'Employee';
    const department = body.department || 'General';
    const siteLocation = body.siteLocation || body.site_location || 'Headquarters';
    const phoneNumber = body.phoneNumber || body.phone_number || '';
    const isActive = body.isActive !== undefined ? body.isActive : true;

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and Full Name are required fields' }, { status: 400 });
    }

    const cleanSlug = tenantSlug.toLowerCase().trim();
    const cleanEmail = String(email).toLowerCase().trim();

    const { data: existingUser } = await supabase
      .from('tenant_users')
      .select('id')
      .ilike('tenant_id', cleanSlug)
      .ilike('email', cleanEmail)
      .maybeSingle();

    let resultData;
    let resultError;

    if (existingUser) {
      const updateData: any = {
        full_name: String(fullName).trim(),
        role,
        job_title: String(jobTitle).trim(),
        department: String(department).trim(),
        site_location: String(siteLocation).trim(),
        phone_number: String(phoneNumber).trim(),
        is_active: isActive,
        updated_at: new Date().toISOString()
      };
      if (body.password) {
        updateData.password_hash = String(password).trim();
      }

      const { data, error } = await supabase
        .from('tenant_users')
        .update(updateData)
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
            password_hash: String(password).trim(),
            full_name: String(fullName).trim(),
            role,
            job_title: String(jobTitle).trim(),
            department: String(department).trim(),
            site_location: String(siteLocation).trim(),
            phone_number: String(phoneNumber).trim(),
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = extractTenant(req);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!tenantSlug || !email) {
      return NextResponse.json({ error: 'Tenant and email are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tenant_users')
      .delete()
      .ilike('tenant_id', tenantSlug)
      .ilike('email', email);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}