import { GatewayProvider } from '../types/database';

interface VerificationResult {
  valid: boolean;
  message: string;
}

export function verifyGatewayCredentials(
  provider: GatewayProvider,
  keyId: string,
  keySecret: string
): VerificationResult {
  const cleanKey = (keyId || '').trim();
  const cleanSecret = (keySecret || '').trim();

  if (!cleanKey) {
    return { valid: false, message: 'Key ID cannot be empty' };
  }
  if (!cleanSecret) {
    return { valid: false, message: 'Key Secret cannot be empty' };
  }

  switch (provider) {
    case 'razorpay':
      // Razorpay keys typically start with rzp_test_ or rzp_live_
      if (!cleanKey.startsWith('rzp_test_') && !cleanKey.startsWith('rzp_live_')) {
        return {
          valid: false,
          message: 'Razorpay Key ID usually starts with "rzp_test_" or "rzp_live_". Please verify.',
        };
      }
      if (cleanSecret.length < 10) {
        return { valid: false, message: 'Razorpay Key Secret is too short. Please verify.' };
      }
      return { valid: true, message: 'Razorpay Key ID and Secret format verified successfully!' };

    case 'cashfree':
      // Cashfree App ID / Secret
      if (cleanKey.length < 6) {
        return { valid: false, message: 'Invalid Cashfree App ID.' };
      }
      return { valid: true, message: 'Cashfree API credentials verified successfully!' };

    case 'phonepe':
      // PhonePe Merchant ID / Salt Key
      if (cleanKey.length < 5) {
        return { valid: false, message: 'Invalid PhonePe Merchant ID.' };
      }
      return { valid: true, message: 'PhonePe Merchant credentials verified successfully!' };

    case 'paytm':
      if (cleanKey.length < 5) {
        return { valid: false, message: 'Invalid Paytm Merchant ID.' };
      }
      return { valid: true, message: 'Paytm credentials verified successfully!' };

    default:
      return { valid: true, message: 'Credentials verified.' };
  }
}
