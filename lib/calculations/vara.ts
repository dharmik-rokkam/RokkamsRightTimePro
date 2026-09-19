import type { VaraResult } from '@/types/panchang';

const VARA_NAMES = [
  { name: 'Ravivara', shortName: 'Sun' },
  { name: 'Somavara', shortName: 'Mon' },
  { name: 'Mangalavara', shortName: 'Tue' },
  { name: 'Budhavara', shortName: 'Wed' },
  { name: 'Guruvara', shortName: 'Thu' },
  { name: 'Shukravara', shortName: 'Fri' },
  { name: 'Shanivara', shortName: 'Sat' },
];

export function calculateVara(date: Date): VaraResult {
  const index = date.getDay();
  return { index, ...VARA_NAMES[index] };
}
