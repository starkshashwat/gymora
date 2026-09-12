import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym } from '@/lib/data/dbSync';
import { gymService } from '@/lib/data/service';
import { SettingsPayload } from '@/lib/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, isDemoMode } = await resolveCurrentGym(request, supabase);

    const settings = gymService.getSettings(gymId);
    const automationRules = gymService.getAutomationRules(gymId);

    // If authenticated and gymId is resolved, also check Supabase gyms table
    if (gymId && !isDemoMode) {
      try {
        const { data: gymRow } = await supabase
          .from('gyms')
          .select('name, slug, phone, email, address, logo_url, upi_id, upi_qr_url, payment_instructions, payment_mode, gateway_provider, gateway_key_id, auto_cancel_overdue_days, whatsapp_mode, fb_waba_id, fb_phone_number_id')
          .eq('id', gymId)
          .maybeSingle();

        if (gymRow) {
          settings.general = {
            name: gymRow.name || settings.general?.name || '',
            phone: gymRow.phone || settings.general?.phone || '',
            email: gymRow.email || settings.general?.email,
            address: gymRow.address || settings.general?.address,
            slug: gymRow.slug || settings.general?.slug || '',
            logo_url: gymRow.logo_url || settings.general?.logo_url,
          };
          settings.payments = {
            upi_id: gymRow.upi_id || settings.payments?.upi_id,
            upi_qr_url: gymRow.upi_qr_url || settings.payments?.upi_qr_url,
            payment_instructions: gymRow.payment_instructions || settings.payments?.payment_instructions,
            gateway_provider: gymRow.gateway_provider || settings.payments?.gateway_provider || null,
            gateway_key_id: gymRow.gateway_key_id || settings.payments?.gateway_key_id,
            is_gateway_enabled: gymRow.payment_mode === 'gateway',
          };
          settings.whatsapp = {
            whatsapp_mode: gymRow.whatsapp_mode || settings.whatsapp?.whatsapp_mode || 'local_click_to_chat',
            fb_waba_id: gymRow.fb_waba_id || settings.whatsapp?.fb_waba_id,
            fb_phone_number_id: gymRow.fb_phone_number_id || settings.whatsapp?.fb_phone_number_id,
          };
          settings.rules = {
            auto_cancel_overdue_days: gymRow.auto_cancel_overdue_days !== undefined ? gymRow.auto_cancel_overdue_days : settings.rules?.auto_cancel_overdue_days,
          };
        }
      } catch (err) {
        console.warn('Supabase settings query warning:', err);
      }
    }

    return NextResponse.json({
      success: true,
      settings,
      automationRules,
      isDemoMode,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, isDemoMode } = await resolveCurrentGym(request, supabase);
    const body: SettingsPayload = await request.json();

    if (!gymId) {
      return NextResponse.json({ success: false, error: 'Gym not found' }, { status: 404 });
    }

    // Always update in-memory store
    const updatedGym = gymService.updateSettings(gymId, body);

    // Persist to Supabase if authenticated
    if (!isDemoMode) {
      try {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (body.general) {
          if (body.general.name) updatePayload.name = body.general.name.trim();
          if (body.general.phone) updatePayload.phone = body.general.phone.trim();
          if (body.general.email !== undefined) updatePayload.email = body.general.email?.trim() || null;
          if (body.general.address !== undefined) updatePayload.address = body.general.address?.trim() || null;
          if (body.general.logo_url !== undefined) updatePayload.logo_url = body.general.logo_url || null;
          if (body.general.slug) updatePayload.slug = body.general.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        }

        if (body.payments) {
          if (body.payments.upi_id !== undefined) updatePayload.upi_id = body.payments.upi_id?.trim() || null;
          if (body.payments.upi_qr_url !== undefined) updatePayload.upi_qr_url = body.payments.upi_qr_url || null;
          if (body.payments.payment_instructions !== undefined) updatePayload.payment_instructions = body.payments.payment_instructions;
          if (body.payments.gateway_provider !== undefined) updatePayload.gateway_provider = body.payments.gateway_provider;
          if (body.payments.gateway_key_id !== undefined) updatePayload.gateway_key_id = body.payments.gateway_key_id?.trim() || null;
          if (body.payments.gateway_key_secret) updatePayload.gateway_key_secret = body.payments.gateway_key_secret?.trim() || null;
          if (body.payments.is_gateway_enabled !== undefined) {
            updatePayload.payment_mode = body.payments.is_gateway_enabled ? 'gateway' : 'local_qr';
          }
        }

        if (body.whatsapp) {
          if (body.whatsapp.whatsapp_mode) updatePayload.whatsapp_mode = body.whatsapp.whatsapp_mode;
          if (body.whatsapp.fb_waba_id !== undefined) updatePayload.fb_waba_id = body.whatsapp.fb_waba_id || null;
          if (body.whatsapp.fb_phone_number_id !== undefined) updatePayload.fb_phone_number_id = body.whatsapp.fb_phone_number_id || null;
          if (body.whatsapp.fb_access_token) updatePayload.fb_access_token = body.whatsapp.fb_access_token || null;
        }

        if (body.rules) {
          if (body.rules.auto_cancel_overdue_days !== undefined) {
            updatePayload.auto_cancel_overdue_days = body.rules.auto_cancel_overdue_days;
          }
        }

        await supabase.from('gyms').update(updatePayload).eq('id', gymId);
      } catch (dbErr) {
        console.warn('Supabase settings update warning:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      gym: {
        id: updatedGym.id,
        name: updatedGym.name,
        slug: updatedGym.slug,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
