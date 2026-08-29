import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('platform_admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ admins: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, role, department } = body;

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and Full Name are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userRole = role || 'Super Admin';
    const userDept = department?.trim() || 'Cloud Operations';
    const userPass = password?.trim() || 'SmartQ2026!';

    // 1. בדיקה אם המשתמש כבר קיים
    const { data: existing } = await supabase
      .from('platform_admins')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    let resultData;
    let resultError;

    if (existing) {
      const { data, error } = await supabase
        .from('platform_admins')
        .update({
          full_name: fullName.trim(),
          role: userRole,
          department: userDept,
          password_hash: userPass,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      resultData = data;
      resultError = error;
    } else {
      const { data, error } = await supabase
        .from('platform_admins')
        .insert([
          {
            email: cleanEmail,
            password_hash: userPass,
            full_name: fullName.trim(),
            role: userRole,
            department: userDept
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

    return NextResponse.json({ success: true, admin: resultData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}