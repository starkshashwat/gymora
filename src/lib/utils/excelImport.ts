import * as XLSX from 'xlsx';
import { ImportedMemberRow } from '../types/database';
import { normalizePhone } from './phone';
import { getTodayDateString } from './date';

export function generateSampleCsv(): string {
  const headers = ['Full Name', 'Mobile Number', 'Email', 'Plan Name', 'Amount Due', 'Due Date'];
  const rows = [
    ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'Monthly Standard', '1500', getTodayDateString()],
    ['Sneha Sharma', '9812345678', 'sneha@example.com', 'Quarterly Pro', '4000', getTodayDateString()],
    ['Amit Patel', '9765432109', '', 'Monthly Standard', '1500', getTodayDateString()],
  ];

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function parseMembersExcel(data: ArrayBuffer): {
  members: ImportedMemberRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const members: ImportedMemberRow[] = [];

  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { members: [], errors: ['Excel file has no sheets'] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { members: [], errors: ['No data rows found in the uploaded file'] };
    }

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1

      // Find fields flexibly by looking across common column header aliases
      let fullName = '';
      let phone = '';
      let email = '';
      let planName = '';
      let amountDue = 0;
      let dueDate = '';

      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        const val = String(row[key] || '').trim();

        if (cleanKey.includes('name') && !cleanKey.includes('plan')) {
          fullName = val;
        } else if (cleanKey.includes('phone') || cleanKey.includes('mobile') || cleanKey.includes('contact')) {
          phone = val;
        } else if (cleanKey.includes('email') || cleanKey.includes('mail')) {
          email = val;
        } else if (cleanKey.includes('plan')) {
          planName = val;
        } else if (cleanKey.includes('amount') || cleanKey.includes('fee') || cleanKey.includes('price')) {
          amountDue = parseFloat(val) || 0;
        } else if (cleanKey.includes('due') || cleanKey.includes('date') || cleanKey.includes('expiry')) {
          dueDate = val;
        }
      }

      if (!fullName) {
        errors.push(`Row ${rowNum}: Name is missing.`);
        return;
      }

      if (!phone) {
        errors.push(`Row ${rowNum}: Phone number is missing for ${fullName}.`);
        return;
      }

      const normalized = normalizePhone(phone);
      if (normalized.length < 10) {
        errors.push(`Row ${rowNum}: Invalid phone number (${phone}) for ${fullName}.`);
        return;
      }

      members.push({
        full_name: fullName,
        phone: normalized,
        email: email || undefined,
        plan_name: planName || 'Monthly Standard',
        amount_due: amountDue > 0 ? amountDue : 1500,
        due_date: dueDate || getTodayDateString(),
        start_date: getTodayDateString(),
      });
    });
  } catch (err: any) {
    errors.push(`Failed to parse file: ${err.message}`);
  }

  return { members, errors };
}
