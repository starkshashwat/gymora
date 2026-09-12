import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const data = gymService.getPublicGymBySlug(params.slug);
    if (!data) {
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

    const result = gymService.createRegistrationRequest({
      gym_slug: params.slug,
      full_name,
      phone,
      email,
      plan_id,
      whatsapp_opt_in: Boolean(whatsapp_opt_in),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
