import * as XLSX from 'xlsx';
import { MemberWithDetails } from '@/lib/types/database';
import { formatDisplayDate } from './date';

/**
 * Exports gym members and their payment dues to a formatted Excel (.xlsx) file.
 * Triggers a direct, client-side browser download.
 */
export function exportMembersToExcel(
  members: MemberWithDetails[],
  filename = 'gymora-members-export.xlsx'
) {
  const rows = members.map((m, index) => {
    const mship = m.membership;
    const paymentStatus = !mship
      ? 'No Active Plan'
      : mship.outstanding_balance === 0
      ? 'Paid'
      : mship.is_overdue
      ? 'Overdue'
      : mship.status === 'partial'
      ? 'Partial Due'
      : 'Due';

    return {
      'S.No': index + 1,
      'Full Name': m.full_name,
      'Phone': m.phone,
      'Email': m.email || '—',
      'Membership Plan': mship?.plan_name_snapshot || '—',
      'Lifecycle Status': mship?.lifecycle || m.status,
      'Payment Status': paymentStatus,
      'Outstanding Due (₹)': mship ? mship.outstanding_balance : 0,
      'Total Plan Price (₹)': mship ? mship.amount_due : 0,
      'Cycle Start Date': mship?.start_date ? formatDisplayDate(mship.start_date) : '—',
      'Cycle End Date': mship?.end_date ? formatDisplayDate(mship.end_date) : '—',
      'Next Due Date': mship?.due_date ? formatDisplayDate(mship.due_date) : '—',
      'Days Overdue': mship?.days_overdue || 0,
      'Last Payment Method': m.last_payment_method ? m.last_payment_method.toUpperCase() : '—',
      'WhatsApp Opt-in': m.whatsapp_opt_in ? 'Yes' : 'No',
      'Member Since': m.joined_at ? formatDisplayDate(m.joined_at) : '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Full Name
    { wch: 15 }, // Phone
    { wch: 24 }, // Email
    { wch: 20 }, // Plan
    { wch: 15 }, // Lifecycle
    { wch: 15 }, // Payment Status
    { wch: 18 }, // Outstanding
    { wch: 18 }, // Price
    { wch: 16 }, // Start Date
    { wch: 16 }, // End Date
    { wch: 16 }, // Due Date
    { wch: 14 }, // Days Overdue
    { wch: 18 }, // Payment Method
    { wch: 15 }, // WhatsApp
    { wch: 16 }, // Member Since
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
  XLSX.writeFile(workbook, filename);
}
