import type { KaranaResult } from '@/types/panchang';

const FIXED_KARANAS = ['Kimstughna', 'Shakuni', 'Chatushpada', 'Naga'];
const REPEATING_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];

// Uses tropical longitudes — ayanamsha cancels in elongation
export function calculateKarana(sunLng: number, moonLng: number): KaranaResult {
  let diff = moonLng - sunLng;
  if (diff < 0) diff += 360;

  const karanaIndex = Math.floor(diff / 6);
  const completion = (diff % 6) / 6;

  let name: string;
  if (karanaIndex === 0) {
    name = FIXED_KARANAS[0];
  } else if (karanaIndex >= 57) {
    name = FIXED_KARANAS[karanaIndex - 56];
  } else {
    name = REPEATING_KARANAS[(karanaIndex - 1) % 7];
  }

  return { index: karanaIndex, completion, name };
}
