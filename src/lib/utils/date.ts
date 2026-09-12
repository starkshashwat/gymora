/**
 * Date utility functions for gym membership cycles and dues.
 * Avoids timezone skew by standardizing on YYYY-MM-DD date strings.
 */

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return formatISODate(new Date());
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

export function getDaysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return -1;
  const today = parseDateString(getTodayDateString());
  const target = parseDateString(dateStr.slice(0, 10));
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(endDateStr: string | null | undefined, withinDays = 7): boolean {
  if (!endDateStr) return false;
  const days = getDaysUntil(endDateStr);
  return days >= 0 && days <= withinDays;
}

export function formatExactDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  
  // If only a date string YYYY-MM-DD
  if (!dateStr.includes('T') && !dateStr.includes(':')) {
    return formatDisplayDate(dateStr);
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return formatDisplayDate(dateStr);
    }
    const dateFormatted = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).replace(/\u202f/g, ' ').toUpperCase();

    return `${dateFormatted} · ${timeFormatted}`;
  } catch {
    return formatDisplayDate(dateStr);
  }
}

export function formatRelativeDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return formatDisplayDate(dateStr);
    }

    const hasTime = dateStr.includes('T') || dateStr.includes(':');
    const timeFormatted = hasTime
      ? d.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).replace(/\u202f/g, ' ').toUpperCase()
      : null;

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) {
      return timeFormatted ? `Today · ${timeFormatted}` : 'Today';
    }
    if (isYesterday) {
      return timeFormatted ? `Yesterday · ${timeFormatted}` : 'Yesterday';
    }

    return formatExactDateTime(dateStr);
  } catch {
    return formatDisplayDate(dateStr);
  }
}
