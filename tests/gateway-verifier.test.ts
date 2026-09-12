import { describe, it, expect } from 'vitest';
import { verifyGatewayCredentials } from '../src/lib/gateways/verifier';

describe('Payment Gateway Verifier Suite', () => {
  it('validates proper Razorpay Key ID and Secret format', () => {
    const valid = verifyGatewayCredentials('razorpay', 'rzp_live_abc1234567890', 'secretkey123456789');
    expect(valid.valid).toBe(true);

    const invalid = verifyGatewayCredentials('razorpay', 'invalid_key', 'short');
    expect(invalid.valid).toBe(false);
  });

  it('validates Cashfree and PhonePe credentials format', () => {
    const cf = verifyGatewayCredentials('cashfree', 'app_id_123456', 'secret_key_123456');
    expect(cf.valid).toBe(true);

    const pp = verifyGatewayCredentials('phonepe', 'merchant_id_123', 'salt_key_123');
    expect(pp.valid).toBe(true);

    const empty = verifyGatewayCredentials('phonepe', '', '');
    expect(empty.valid).toBe(false);
  });
});
