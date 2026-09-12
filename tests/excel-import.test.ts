import { describe, it, expect } from 'vitest';
import { generateSampleCsv, parseMembersExcel } from '../src/lib/utils/excelImport';
import * as XLSX from 'xlsx';

describe('Excel & CSV Member Import Suite', () => {
  it('generates a valid CSV sample template', () => {
    const csv = generateSampleCsv();
    expect(csv).toContain('Full Name,Mobile Number,Email,Plan Name,Amount Due,Due Date');
    expect(csv).toContain('Rajesh Kumar');
  });

  it('parses members from a generated spreadsheet buffer successfully', () => {
    const data = [
      { 'Full Name': 'Vikas Malhotra', 'Mobile Number': '9876543210', 'Plan Name': 'Monthly Standard', 'Amount Due': 1500 },
      { 'Full Name': 'Simran Kaur', 'Mobile Number': '9812345678', 'Plan Name': 'Quarterly Pro', 'Amount Due': 4000 },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseMembersExcel(buffer);
    expect(result.errors.length).toBe(0);
    expect(result.members.length).toBe(2);
    expect(result.members[0].full_name).toBe('Vikas Malhotra');
    expect(result.members[0].phone).toBe('+919876543210');
    expect(result.members[1].full_name).toBe('Simran Kaur');
    expect(result.members[1].amount_due).toBe(4000);
  });

  it('flags errors when mandatory columns (name, phone) are missing', () => {
    const data = [
      { 'Full Name': '', 'Mobile Number': '9876543210' }, // missing name
      { 'Full Name': 'Ankit Roy', 'Mobile Number': '' },  // missing phone
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseMembersExcel(buffer);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.members.length).toBe(0);
  });
});
