'use client';

import { useState, useEffect } from 'react';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function computeRateCyclePeriod(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 to 11
  const lastDay = new Date(year, month + 1, 0).getDate();
  const thaiMonth = THAI_MONTHS_SHORT[month] || '';
  return `1 - ${lastDay} ${thaiMonth} ${year}`;
}

export function computeRateCycleMonthYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const thaiMonth = THAI_MONTHS_SHORT[month] || '';
  return `${thaiMonth} ${year}`;
}

/**
 * Custom React Hook that returns dynamic rate cycle period & month/year
 * synced in real-time with the client's current date and time.
 */
export function useRateCycle() {
  const [period, setPeriod] = useState<string>('1 - 30 พ.ย. 2026');
  const [monthYear, setMonthYear] = useState<string>('พ.ย. 2026');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setPeriod(computeRateCyclePeriod(now));
      setMonthYear(computeRateCycleMonthYear(now));
    };

    update();
    // Periodically sync every minute so month changes roll over seamlessly
    const interval = setInterval(update, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { period, monthYear };
}
