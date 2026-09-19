import type { SamvatResult } from '@/types/panchang';

function isAfterChaitraShuklaEka(month: number, day: number): boolean {
  return month > 3 || (month === 3 && day >= 15);
}

function isAfterKartikShuklaEka(month: number, day: number): boolean {
  return month > 10 || (month === 10 && day >= 15);
}

export function calculateSamvat(date: Date): SamvatResult {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const afterChaitra = isAfterChaitraShuklaEka(month, day);

  const vikrama = afterChaitra ? year + 57 : year + 56;
  const shaka = afterChaitra ? year - 78 : year - 77;
  const afterKartik = isAfterKartikShuklaEka(month, day);
  const gujarati = afterKartik ? year + 57 : year + 56;

  return { vikrama, shaka, gujarati };
}
