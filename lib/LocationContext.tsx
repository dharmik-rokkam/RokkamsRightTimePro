'use client';
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LOCATION } from './location';
import { formatTime, getPageDayEndMs, getTimingLocalDate, getTodayIn } from './formatTime';

const TimezoneContext = createContext<string>(DEFAULT_LOCATION.timezone);

export function LocationProvider({ timezone, children }: { timezone: string; children: ReactNode }) {
  return <TimezoneContext.Provider value={timezone}>{children}</TimezoneContext.Provider>;
}

export function useTimezone(): string {
  return useContext(TimezoneContext);
}

/** The time helpers from formatTime.ts, already bound to the selected city's timezone. */
export function useTimeUtils() {
  const tz = useTimezone();
  return useMemo(() => ({
    tz,
    formatTime: (iso: string | null | undefined) => formatTime(iso, tz),
    getTimingLocalDate: (iso: string) => getTimingLocalDate(iso, tz),
    getPageDayEndMs: (pageDate: string) => getPageDayEndMs(pageDate, tz),
    getToday: () => getTodayIn(tz),
  }), [tz]);
}
