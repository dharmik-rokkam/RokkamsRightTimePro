'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ExpandSection from '@/components/ui/ExpandSection';
import DateTag from '@/components/ui/DateTag';
import { formatTime, getPageDayEndMs } from '@/lib/formatTime';
import { computeRankedSlots } from '@/lib/rankedSlots';

const CLOSE_ALL = 'infodot:closeAll';

function rankClass(i: number) {
  return i < 3 ? `rank-${i + 1}` : 'rank-n';
}

interface Props { muhurta: Record<string, any>; panchangData: any; pageDate: string; }

export default function RankingTime({ muhurta, panchangData, pageDate }: Props) {
  const pageEndMs = getPageDayEndMs(pageDate);
  const nextSunriseMs = panchangData.sunMoonTimes?.nextSunrise
    ? new Date(panchangData.sunMoonTimes.nextSunrise).getTime()
    : undefined;
  const ranked = computeRankedSlots(muhurta, nextSunriseMs).filter(s => s.start < pageEndMs);

  // Single popup state (stars only — lists the contributing muhurtas).
  const [popup, setPopup] = useState<{ index: number; pos: { top: number; left: number } } | null>(null);
  const [mounted, setMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close when another InfoDot opens
  useEffect(() => {
    function handleCloseAll() { setPopup(null); }
    document.addEventListener(CLOSE_ALL, handleCloseAll);
    return () => document.removeEventListener(CLOSE_ALL, handleCloseAll);
  }, []);

  // Close on outside click, scroll, or touch
  useEffect(() => {
    if (!popup) return;
    function close() { setPopup(null); }
    function outside(e: MouseEvent) {
      if (popupRef.current?.contains(e.target as Node)) return;
      setPopup(null);
    }
    function touchOutside(e: TouchEvent) {
      if (popupRef.current?.contains(e.target as Node)) return;
      setPopup(null);
    }
    document.addEventListener('mousedown', outside);
    window.addEventListener('scroll', close, true);
    document.addEventListener('touchstart', touchOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('touchstart', touchOutside);
    };
  }, [popup]);

  function openPopup(e: React.MouseEvent, index: number) {
    e.stopPropagation();
    // Signal all InfoDots to close
    document.dispatchEvent(new CustomEvent(CLOSE_ALL));
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 268, H = 180;
    let left = rect.left;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + H > window.innerHeight - 8) top = rect.top - H - 6;
    if (top < 8) top = 8;
    setPopup(prev => prev?.index === index ? null : { index, pos: { top, left } });
  }

  const activeText = (popup ? ranked[popup.index] : null)?.labels.join('\n') ?? '';

  return (
    <ExpandSection title="Ranking of Best Auspicious Time" accentColor="var(--auspicious-text)">
      {ranked.length === 0 ? (
        <p style={{ color: 'var(--moonsilver-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>No clean auspicious windows today.</p>
      ) : (
        ranked.map((slot, i) => {
          const startIso = new Date(slot.start).toISOString();
          const endIso   = new Date(Math.min(slot.end, pageEndMs - 60_000)).toISOString();
          const stars = '✦'.repeat(Math.min(slot.score, 5));
          return (
            <div key={i} className="time-chip" style={{ alignItems: 'center', gap: '0.6rem' }}>
              <span className={`rank-badge ${rankClass(i)}`}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="time-range"><DateTag iso={startIso} pageDate={pageDate} />{formatTime(startIso)} — <DateTag iso={endIso} pageDate={pageDate} />{formatTime(endIso)}</span>
                  <span
                    onClick={e => openPopup(e, i)}
                    onTouchEnd={e => openPopup(e as any, i)}
                    role="button"
                    tabIndex={0}
                    style={{ color: 'var(--gold-light)', fontSize: '0.65rem', cursor: 'pointer' }}
                    onKeyDown={e => e.key === 'Enter' && openPopup(e as any, i)}
                  >
                    {stars}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}

      {mounted && popup && createPortal(
        <div
          ref={popupRef}
          className="info-popup"
          style={{ top: popup.pos.top, left: popup.pos.left, position: 'fixed', zIndex: 99999, maxWidth: 268, minWidth: 160 }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--moonsilver)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {activeText}
          </div>
        </div>,
        document.body
      )}
    </ExpandSection>
  );
}
