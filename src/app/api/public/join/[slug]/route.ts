import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const cleanSlug = params.slug.toLowerCase().trim();
    let data = gymService.getPublicGymBySlug(cleanSlug);

    // Database fallback if gym was newly registered or memory was re-initialized
    if (!data) {
      try {
        const supabase = createClient();
        const { data: gymRow } = await supabase
          .from('gyms')
          .select('id, name, slug, phone, email, address, logo_url, custom_domain')
          .or(`slug.eq.${cleanSlug},custom_domain.eq.${cleanSlug}`)
          .maybeSingle();

        if (gymRow) {
          const { data: plansRows } = await supabase
            .from('membership_plans')
            .select('*')
            .eq('gym_id', gymRow.id)
            .eq('is_active', true);

          return NextResponse.json({
            success: true,
            gym: {
              name: gymRow.name,
              slug: gymRow.slug,
              phone: gymRow.phone,
              email: gymRow.email,
              address: gymRow.address,
              logo_url: gymRow.logo_url,
            },
            plans: (plansRows || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              duration_days: p.duration_days,
              price: Number(p.price),
              description: p.description,
              image_url: p.image_url,
              features: p.features || [],
            })),
          });
        }
      } catch (dbErr) {
        console.warn('Database fallback lookup error in GET /api/public/join:', dbErr);
      }

      return NextResponse.json({ success: false, error: 'Gym not found' }, { status: 404 });
    }

    // Explicitly safe payload - Zero private credentials or API keys exposed
    return NextResponse.json({
      success: true,
      gym: {
        name: data.gym.name,
        slug: data.gym.slug,
        phone: data.gym.phone,
        email: data.gym.email,
        address: data.gym.address,
        logo_url: data.gym.logo_url,
      },
      plans: data.plans.map((p) => ({
        id: p.id,
        name: p.name,
        duration_days: p.duration_days,
        price: p.price,
        description: p.description,
        image_url: p.image_url,
        features: p.features || [],
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { full_name, phone, email, plan_id, whatsapp_opt_in } = body;

    if (!full_name || !phone || !plan_id) {
      return NextResponse.json(
        { success: false, error: 'Full name, phone, and plan selection are required' },
        { status: 400 }
      );
    }

    const cleanSlug = params.slug.toLowerCase().trim();

    // 1. Create in-memory registration for synchronous response
    let memoryResult: any = null;
    try {
      memoryResult = gymService.createRegistrationRequest({
        gym_slug: cleanSlug,
        full_name,
        phone,
        email,
        plan_id,
        whatsapp_opt_in: Boolean(whatsapp_opt_in),
      });
    } catch (memErr) {
      console.warn('Memory createRegistrationRequest error:', memErr);
    }

    // 2. Persist to Supabase database so all devices and dashboards receive instant notification
    let dbRegistrationId: string | null = null;
    try {
      const supabase = createClient();

      // Try RPC first
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_registration_request', {
        p_gym_slug: cleanSlug,
        p_full_name: full_name.trim(),
        p_phone: phone.trim(),
        p_email: email?.trim() || null,
        p_plan_id: plan_id,
      });

      if (!rpcErr && rpcRes?.registration_id) {
        dbRegistrationId = rpcRes.registration_id;
      } else {
        // Fallback: direct table insert
        const { data: gymRow } = await supabase
          .from('gyms')
          .select('id, name')
          .or(`slug.eq.${cleanSlug},custom_domain.eq.${cleanSlug}`)
          .maybeSingle();

        const gymId = gymRow?.id || (memoryResult ? gymService.getGymBySlug(cleanSlug)?.id : null);

        if (gymId) {
          const { data: planRow } = await supabase
            .from('membership_plans')
            .select('id, name, price')
            .eq('id', plan_id)
            .maybeSingle();

          const insertPayload = {
            id: memoryResult?.registration_id,
            gym_id: gymId,
            full_name: full_name.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            plan_id,
            plan_name_snapshot: planRow?.name || memoryResult?.plan_name || 'Membership Plan',
            plan_price_snapshot: planRow?.price || memoryResult?.price || 0,
            whatsapp_opt_in: Boolean(whatsapp_opt_in),
            status: 'pending',
          };

          const { data: insertedRow } = await supabase
            .from('registration_requests')
            .insert(insertPayload)
            .select('id')
            .maybeSingle();

          if (insertedRow?.id) {
            dbRegistrationId = insertedRow.id;
          }
        }
      }
    } catch (dbErr) {
      console.warn('Supabase registration sync warning:', dbErr);
    }

    if (!memoryResult && !dbRegistrationId) {
      throw new Error('Failed to record registration request');
    }

    return NextResponse.json(
      memoryResult || {
        success: true,
        registration_id: dbRegistrationId,
        message: 'Registration submitted successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
