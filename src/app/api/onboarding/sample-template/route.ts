import { NextResponse } from 'next/server';
import { generateSampleCsv } from '@/lib/utils/excelImport';

export async function GET() {
  const csv = generateSampleCsv();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gymora_member_import_template.csv"',
    },
  });
}
