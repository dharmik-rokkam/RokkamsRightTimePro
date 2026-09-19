import type { TithiResult } from '@/types/panchang';

const SHUKLA_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
];

const KRISHNA_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
];

// Uses tropical longitudes — ayanamsha cancels in elongation
export function calculateTithi(sunLng: number, moonLng: number): TithiResult {
  let diff = moonLng - sunLng;
  if (diff < 0) diff += 360;

  const index = Math.floor(diff / 12);
  const completion = (diff % 12) / 12;
  const paksha = index < 15 ? 'Shukla' : 'Krishna';
  const tithiInPaksha = (index % 15) + 1;

  const nameArr = paksha === 'Shukla' ? SHUKLA_NAMES : KRISHNA_NAMES;
  const name = nameArr[tithiInPaksha - 1];

  return { index, paksha, tithiInPaksha, completion, name };
}
