import { TimeSlot, SlotPeriod } from '../types';

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

export function formatDateLabel(isoDate: string): { dayLabel: string; dateFormatted: string } {
  try {
    const d = parseIsoDate(isoDate);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dayLabel, dateFormatted };
  } catch {
    return { dayLabel: 'Day', dateFormatted: isoDate };
  }
}

export function generateSlotsForDates(dates: string[]): TimeSlot[] {
  const slots: TimeSlot[] = [];

  const periods: {
    period: SlotPeriod;
    periodLabel: string;
    timeLabel: string;
    startTime: string;
    endTime: string;
  }[] = [
    {
      period: 'morning',
      periodLabel: 'Morning Focus',
      timeLabel: '09:30 - 11:30 AM',
      startTime: '09:30',
      endTime: '11:30',
    },
    {
      period: 'lunch',
      periodLabel: 'Midday Sync',
      timeLabel: '12:00 - 02:00 PM',
      startTime: '12:00',
      endTime: '14:00',
    },
    {
      period: 'afternoon',
      periodLabel: 'Afternoon Session',
      timeLabel: '02:30 - 04:30 PM',
      startTime: '14:30',
      endTime: '16:30',
    },
    {
      period: 'evening',
      periodLabel: 'Evening Social',
      timeLabel: '05:30 - 07:30 PM',
      startTime: '17:30',
      endTime: '19:30',
    },
  ];

  // Sort dates chronologically
  const sortedDates = [...dates].sort();

  sortedDates.forEach((dateStr) => {
    const { dayLabel, dateFormatted } = formatDateLabel(dateStr);

    periods.forEach((p) => {
      slots.push({
        id: `${dateStr}_${p.period}`,
        date: dateStr,
        dayLabel,
        dateFormatted,
        period: p.period,
        periodLabel: p.periodLabel,
        timeLabel: p.timeLabel,
        startTime: p.startTime,
        endTime: p.endTime,
      });
    });
  });

  return slots;
}

export function getTodayIsoString(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
