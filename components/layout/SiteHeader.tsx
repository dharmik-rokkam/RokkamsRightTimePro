'use client';
import { useEffect, useState } from 'react';
import DateNavigator from '@/components/panchang/DateNavigator';
import { useTheme } from '@/lib/useTheme';
import { getMuscatToday } from '@/lib/formatTime';

interface Props {
  dateStr: string;
  onDateChange: (d: string) => void;
  numRoot: number;
}

export default function SiteHeader({ dateStr, onDateChange, numRoot }: Props) {
  const { theme, toggle } = useTheme();
  const today = getMuscatToday();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 600);
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--night-deep)',
      borderBottom: '1px solid var(--night-border)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>
      <div style={{ borderBottom: '1px solid var(--night-border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.45rem 1rem 0.3rem',
          gap: '0.5rem',
          maxWidth: 680, margin: '0 auto',
          flexWrap: 'nowrap', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', minWidth: 0, overflow: 'hidden' }}>
            <span
              className="header-title"
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 'clamp(0.7rem, 3vw, 1rem)',
                fontWeight: 700,
                color: 'var(--gold-light)',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                flexShrink: 1,
              }}>
              Rokkam&apos;s Right Time
            </span>
            <span style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(0.52rem, 1.6vw, 0.68rem)',
              color: 'var(--moonsilver-dim)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 1,
            }}>
              Muscat, Oman
            </span>
          </div>

          <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
            style={{ flexShrink: 0, width: '24px', height: '24px', fontSize: '0.78rem' }}
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.35rem 1rem 0.4rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '0.4rem',
          flexWrap: 'nowrap', overflow: 'hidden',
        }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <DateNavigator dateStr={dateStr} onChange={onDateChange} />
          </div>

          <div className="num-circle" title={`Numerology digit root of ${dateStr}`} style={{ flexShrink: 0 }}>{numRoot}</div>

          {dateStr !== today && (
            <button
              onClick={() => onDateChange(today)}
              style={{
                background: 'none', border: '1px solid var(--saffron)',
                borderRadius: '2px', color: 'var(--saffron)',
                padding: '0.2rem 0.4rem', cursor: 'pointer',
                fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.48rem, 1.8vw, 0.58rem)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {isMobile ? '↺' : 'Today'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
