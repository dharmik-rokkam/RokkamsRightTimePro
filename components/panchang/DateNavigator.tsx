'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDateDisplay, getMuscatToday, stepDate } from '@/lib/formatTime';
import { ScrollColumn } from './ScrollPicker';

interface Props { dateStr: string; onChange: (d: string) => void; }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

function buildYears(center: number): string[] {
  const years: string[] = [];
  for (let y = center - 200; y <= center + 200; y++) {
    years.push(String(y));
  }
  return years;
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--night-border)',
  borderRadius: '2px',
  color: 'var(--gold)',
  padding: '0.28rem 0.5rem',
  cursor: 'pointer',
  fontSize: '1rem',
  lineHeight: 1,
  flexShrink: 0,
};

export default function DateNavigator({ dateStr, onChange }: Props) {
  const today = getMuscatToday();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

  const { y: initY, m: initM, d: initD } = parseDate(dateStr);
  const [selYear, setSelYear]   = useState(initY);
  const [selMonth, setSelMonth] = useState(initM);
  const [selDay, setSelDay]     = useState(initD);
  const [windowWidth, setWindowWidth] = useState<number>(390);

  const iconRef   = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const { y, m, d } = parseDate(dateStr);
    setSelYear(y); setSelMonth(m); setSelDay(d);
  }, [dateStr]);

  useEffect(() => {
    if (pickerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    function close() { setPickerOpen(false); }
    function outside(e: MouseEvent) {
      const t = e.target as Node;
      if (pickerRef.current?.contains(t) || iconRef.current?.contains(t)) return;
      setPickerOpen(false);
    }
    function touchOutside(e: TouchEvent) {
      const t = e.target as Node;
      if (pickerRef.current?.contains(t) || iconRef.current?.contains(t)) return;
      setPickerOpen(false);
    }
    document.addEventListener('mousedown', outside);
    window.addEventListener('scroll', close, true);
    document.addEventListener('touchstart', touchOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('touchstart', touchOutside);
    };
  }, [pickerOpen]);

  function openPicker() {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const W = Math.min(300, windowWidth - 16);
    let left = rect.left;
    if (left + W > windowWidth - 8) left = windowWidth - W - 8;
    if (left < 8) left = 8;
    setPickerPos({ top: rect.bottom + 6, left });
    const { y, m, d } = parseDate(dateStr);
    setSelYear(y); setSelMonth(m); setSelDay(d);
    setPickerOpen(v => !v);
  }

  function applyDate() {
    const maxDay = getDaysInMonth(selYear, selMonth);
    const day = Math.min(selDay, maxDay);
    const s = `${selYear}-${String(selMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(s);
    setPickerOpen(false);
  }

  const maxDay = getDaysInMonth(selYear, selMonth);
  const dayItems = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const dayIdx = Math.min(selDay, maxDay) - 1;
  const monthIdx = selMonth - 1;
  const yearBase = initY;
  const yearItems = buildYears(yearBase);
  const yearIdx = yearItems.indexOf(String(selYear));

  function handleDayChange(i: number) { setSelDay(i + 1); }
  function handleMonthChange(i: number) {
    setSelMonth(i + 1);
    const max = getDaysInMonth(selYear, i + 1);
    if (selDay > max) setSelDay(max);
  }
  function handleYearChange(i: number) {
    const y = parseInt(yearItems[i]);
    setSelYear(y);
    const max = getDaysInMonth(y, selMonth);
    if (selDay > max) setSelDay(max);
  }

  const pickerWidth = Math.max(200, Math.min(300, windowWidth - 16));
  const picker = (
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        top: pickerPos.top,
        left: pickerPos.left,
        width: pickerWidth,
        background: 'var(--night-elevated)',
        border: '1px solid var(--gold-dim)',
        borderRadius: '6px',
        padding: '1rem 0.75rem 0.85rem',
        zIndex: 99998,
        boxShadow: '0 16px 56px rgba(0,0,0,0.85)',
        animation: 'popupIn 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'flex-start' }}>
        <ScrollColumn items={dayItems} selectedIndex={dayIdx} onChange={handleDayChange} width={56} label="Day" />
        <ScrollColumn items={MONTHS} selectedIndex={monthIdx} onChange={handleMonthChange} width={120} label="Month" />
        <ScrollColumn items={yearItems} selectedIndex={Math.max(0, yearIdx)} onChange={handleYearChange} width={64} label="Year" />
      </div>
      <button
        onClick={applyDate}
        style={{
          marginTop: '0.85rem', width: '100%',
          background: 'var(--gold)', border: 'none',
          borderRadius: '2px', color: 'var(--night-deep)',
          padding: '0.45rem', cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: '0.7rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontWeight: 700,
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'var(--gold-light)')}
        onMouseOut={e => (e.currentTarget.style.background = 'var(--gold)')}
      >
        Set Date
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', position: 'relative', flexWrap: 'nowrap' }}>
      <button onClick={() => onChange(stepDate(dateStr, -1))} aria-label="Previous day" style={{ ...btnStyle, padding: '0.25rem 0.4rem', fontSize: '1.1rem' }}>‹</button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        background: 'var(--night-surface)',
        border: '1px solid var(--night-border)',
        borderRadius: '2px',
        padding: '0.25rem 0.5rem',
        minWidth: 0, flex: '1 1 auto',
      }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.7rem, 3vw, 0.85rem)', color: 'var(--gold-light)', letterSpacing: '0.04em', whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>
          {formatDateDisplay(dateStr)}
        </span>
        <button
          ref={iconRef}
          onClick={openPicker}
          aria-label="Open date picker"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', padding: 0, lineHeight: 1, opacity: 0.75, flexShrink: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>

      <button onClick={() => onChange(stepDate(dateStr, 1))} aria-label="Next day" style={{ ...btnStyle, padding: '0.25rem 0.4rem', fontSize: '1.1rem' }}>›</button>

      {mounted && pickerOpen && createPortal(picker, document.body)}
    </div>
  );
}
