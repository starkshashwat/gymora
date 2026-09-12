import { describe, it, expect } from 'vitest';
import {
  isDueToday,
  isOverdue,
  getDaysOverdue,
  getTodayDateString,
  formatExactDateTime,
  formatRelativeDateTime,
  formatDisplayDate,
} from '../src/lib/utils/date';

describe('Date & Due Utilities', () => {
  const today = getTodayDateString();

  it('detects when membership is due today', () => {
    expect(isDueToday(today)).toBe(true);
    expect(isDueToday('2020-01-01')).toBe(false);
  });

  it('identifies overdue memberships only if outstanding > 0 and date in the past', () => {
    expect(isOverdue('2020-01-01', 500)).toBe(true);
    // If outstanding balance is 0, it is NOT overdue
    expect(isOverdue('2020-01-01', 0)).toBe(false);
    // Future date is not overdue
    expect(isOverdue('2099-01-01', 500)).toBe(false);
  });

  it('calculates days overdue accurately', () => {
    // 5 days ago
    const d = new Date();
    d.setDate(d.getDate() - 5);
    const fiveDaysAgo = d.toISOString().slice(0, 10);

    expect(getDaysOverdue(fiveDaysAgo)).toBe(5);
  });

  it('formats exact date and time properly', () => {
    expect(formatExactDateTime(null)).toBe('—');
    expect(formatExactDateTime(undefined)).toBe('—');
    expect(formatExactDateTime('')).toBe('—');

    // Date-only string
    expect(formatExactDateTime('2026-09-12')).toContain('2026');

    // ISO timestamp with time
    const isoString = '2026-09-12T16:08:00.000Z';
    const formatted = formatExactDateTime(isoString);
    expect(formatted).toContain('·');
    expect(formatted).toMatch(/(AM|PM)/);
  });

  it('formats relative date and time properly', () => {
    const nowIso = new Date().toISOString();
    const formattedToday = formatRelativeDateTime(nowIso);
    expect(formattedToday).toContain('Today ·');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedYesterday = formatRelativeDateTime(yesterday.toISOString());
    expect(formattedYesterday).toContain('Yesterday ·');

    const pastDate = '2025-01-01T10:00:00.000Z';
    const formattedPast = formatRelativeDateTime(pastDate);
    expect(formattedPast).toContain('2025');
  });
});

