import { getWhatsAppPhone } from './phone';

interface WhatsAppReminderParams {
  phone: string;
  name: string;
  amount: number;
  statusType?: 'due' | 'overdue';
}

export function buildWhatsAppReminderUrl({
  phone,
  name,
  amount,
  statusType = 'due',
}: WhatsAppReminderParams): string {
  const formattedPhone = getWhatsAppPhone(phone);
  const statusWord = statusType === 'overdue' ? 'overdue' : 'due';
  
  // Format amount cleanly without decimal if integer, e.g. 1500
  const formattedAmount = Number(amount).toLocaleString('en-IN');

  const message = `Hi ${name}, your gym membership payment of ₹${formattedAmount} is ${statusWord}. Please make the payment at your earliest convenience. Thank you.`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}
