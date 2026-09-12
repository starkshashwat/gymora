import { describe, it, expect } from 'vitest';
import { normalizePhone, getWhatsAppPhone } from '../src/lib/utils/phone';

describe('Phone Utilities', () => {
  it('normalizes a standard 10-digit Indian mobile number', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
  });

  it('normalizes a 10-digit number with leading 0', () => {
    expect(normalizePhone('09876543210')).toBe('+919876543210');
  });

  it('preserves an existing international E.164 number', () => {
    expect(normalizePhone('+14155552671')).toBe('+14155552671');
    expect(normalizePhone('+919876543210')).toBe('+919876543210');
  });

  it('cleans up spaces, hyphens, and parenthesis', () => {
    expect(normalizePhone('+91 (987) 654-3210')).toBe('+919876543210');
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
  });

  it('formats correctly for WhatsApp click-to-chat url path without +', () => {
    expect(getWhatsAppPhone('+919876543210')).toBe('919876543210');
    expect(getWhatsAppPhone('9876543210')).toBe('919876543210');
  });
});
