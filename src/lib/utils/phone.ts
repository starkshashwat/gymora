/**
 * Utility for phone number formatting and normalization.
 */

export function normalizePhone(rawPhone: string, defaultCountryCode = '91'): string {
  if (!rawPhone) return '';

  // Remove any character that isn't a digit or leading plus
  let cleaned = rawPhone.trim().replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    // E.164 already
    return cleaned;
  }

  // Handle leading 0 (e.g. 09876543210)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits, assume defaultCountryCode (default: India +91)
  if (cleaned.length === 10) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  // If already starts with country code without plus (e.g. 919876543210)
  if (cleaned.length === 12 && cleaned.startsWith(defaultCountryCode)) {
    return `+${cleaned}`;
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Returns digits-only for WhatsApp deep links (e.g. 919876543210 without + sign)
 */
export function getWhatsAppPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return normalized.replace(/\+/g, '');
}
