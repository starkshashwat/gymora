import { describe, it, expect } from 'vitest';
import { isDueToday, isOverdue, getDaysOverdue, getTodayDateString } from '../src/lib/utils/date';

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
});
