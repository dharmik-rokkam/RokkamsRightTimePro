export function dateToJDN(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  jdn += (hour - 12) / 24 + minute / 1440 + second / 86400;
  return jdn;
}

export function jdnToDate(jdn: number): { year: number; month: number; day: number } {
  const a = Math.floor(jdn + 0.5) + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return { year, month, day };
}

export function dateObjectToJDN(date: Date): number {
  return dateToJDN(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}

export function localMidnightJDN(dateStr: string, timezoneOffsetHours: number): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcHour = -timezoneOffsetHours;
  return dateToJDN(year, month, day, utcHour);
}
