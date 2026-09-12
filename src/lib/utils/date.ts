/**
 * Date utility functions for gym membership cycles and dues.
 * Avoids timezone skew by standardizing on YYYY-MM-DD date strings.
 */

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isDueToday(dueDateStr: string): boolean {
  if (!dueDateStr) return false;
  return dueDateStr.startsWith(getTodayDateString());
}

export function isOverdue(dueDateStr: string, outstandingBalance: number): boolean {
  if (!dueDateStr || outstandingBalance <= 0) return false;
  const today = getTodayDateString();
  return dueDateStr.slice(0, 10) < today;
}

export function getDaysOverdue(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  const today = parseDateString(getTodayDateString());
  const due = parseDateString(dueDateStr.slice(0, 10));
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const cleanDate = dateStr.slice(0, 10);
  const date = parseDateString(cleanDate);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
