export const MUSCAT_TZ = 'Asia/Muscat';

export function getTimingLocalDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MUSCAT_TZ }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MUSCAT_TZ,
  });
}

export function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function getMuscatToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MUSCAT_TZ }).format(new Date());
}

export function stepDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function getPageDayEndMs(pageDate: string): number {
  // Midnight (end of calendar day) in Muscat (UTC+4) = pageDate T20:00:00Z
  const [y, m, d] = pageDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 20, 0, 0);
}

export function digitRoot(dateStr: string): number {
  const digits = dateStr.replace(/-/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9) {
    sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}
