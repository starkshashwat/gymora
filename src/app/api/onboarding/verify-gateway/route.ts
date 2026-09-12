import { NextRequest, NextResponse } from 'next/server';
import { verifyGatewayCredentials } from '@/lib/gateways/verifier';
import { GatewayProvider } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, key_id, key_secret } = body;

    if (!provider || !key_id || !key_secret) {
      return NextResponse.json(
        { valid: false, message: 'Provider, Key ID, and Key Secret are all required' },
        { status: 400 }
      );
    }

    const result = verifyGatewayCredentials(
      provider as GatewayProvider,
      key_id,
      key_secret
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, message: error.message || 'Verification error' },
      { status: 500 }
    );
  }
}
