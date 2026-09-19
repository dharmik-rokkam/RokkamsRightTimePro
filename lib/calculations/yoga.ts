import type { YogaResult } from '@/types/panchang';

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarman', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Mahendra', 'Vaidhriti',
];

const AUSPICIOUS_YOGA_INDICES = new Set([1,2,3,4,6,7,10,11,13,15,17,19,20,21,22,23,24,25]);

const YOGA_ARC = 360 / 27;

// Requires sidereal Sun and Moon longitudes
export function calculateYoga(siderealSunLng: number, siderealMoonLng: number): YogaResult {
  const sum = (siderealSunLng + siderealMoonLng) % 360;
  const index = Math.floor(sum / YOGA_ARC);
  const completion = (sum % YOGA_ARC) / YOGA_ARC;

  return {
    index,
    completion,
    name: YOGA_NAMES[index],
    isAuspicious: AUSPICIOUS_YOGA_INDICES.has(index),
  };
}
