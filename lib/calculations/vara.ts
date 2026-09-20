import type { VaraResult } from '@/types/panchang';
import { localDateString, weekdayOfDateString } from '../timezone';

const VARA_NAMES = [
  { name: 'Ravivara', shortName: 'Sun' },
  { name: 'Somavara', shortName: 'Mon' },
  { name: 'Mangalavara', shortName: 'Tue' },
  { name: 'Budhavara', shortName: 'Wed' },
  { name: 'Guruvara', shortName: 'Thu' },
  { name: 'Shukravara', shortName: 'Fri' },
  { name: 'Shanivara', shortName: 'Sat' },
];

/** Weekday of the calendar date `date` falls on in `tz` (never the server's own timezone). */
export function calculateVara(date: Date, tz: string): VaraResult {
  const index = weekdayOfDateString(localDateString(date, tz));
  return { index, ...VARA_NAMES[index] };
}
