import { describe, it, expect } from 'vitest';
import { buildWhatsAppReminderUrl } from '../src/lib/utils/whatsapp';

describe('WhatsApp Link Builder', () => {
  it('builds a proper click-to-chat URL for due payments', () => {
    const url = buildWhatsAppReminderUrl({
      phone: '+919876543210',
      name: 'Aarav Sharma',
      amount: 1500,
      statusType: 'due',
    });

    expect(url).toContain('https://wa.me/919876543210?text=');
    const encodedPart = url.split('text=')[1];
    const decoded = decodeURIComponent(encodedPart);

    expect(decoded).toBe(
      'Hi Aarav Sharma, your gym membership payment of ₹1,500 is due. Please make the payment at your earliest convenience. Thank you.'
    );
  });

  it('builds a proper click-to-chat URL for overdue payments', () => {
    const url = buildWhatsAppReminderUrl({
      phone: '9812345678',
      name: 'Priya Patel',
      amount: 4000,
      statusType: 'overdue',
    });

    expect(url).toContain('https://wa.me/919812345678?text=');
    const decoded = decodeURIComponent(url.split('text=')[1]);

    expect(decoded).toBe(
      'Hi Priya Patel, your gym membership payment of ₹4,000 is overdue. Please make the payment at your earliest convenience. Thank you.'
    );
  });
});
