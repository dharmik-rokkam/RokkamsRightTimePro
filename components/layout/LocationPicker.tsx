'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Location } from '@/types/panchang';

interface CityResult {
  geonameId: number;
  city: string;
  name: string;
  lat: number;
  lng: number;
  elevation: number;
  timezone: string;
}

interface Props {
  location: Location;
  onChange: (l: Location) => void;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

function toLocation(c: CityResult): Location {
  return {
    lat: c.lat,
    lng: c.lng,
    name: c.name,
    timezone: c.timezone,
    elevation: c.elevation,
    geonameId: c.geonameId,
    city: c.city,
  };
}

export default function LocationPicker({ location, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });

  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Lock page scroll while the popup is open (same as the date picker).
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on outside press / Escape.
  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function key(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside, { passive: true });
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  // Debounced search; a newer keystroke cancels the older request so stale results never show.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); setStatus('idle'); return; }
    setStatus('loading');
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        setResults(Array.isArray(j.cities) ? j.cities : []);
        setActive(0);
        setStatus('done');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setStatus('error');
      }
    }, 250);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, open]);

  // Keep the highlighted row in view when navigating by keyboard.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function openPopup() {
    if (open) { setOpen(false); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.max(220, Math.min(340, vw - 16));
    let left = rect ? rect.left : 8;
    if (left + width > vw - 8) left = vw - width - 8;
    if (left < 8) left = 8;
    setPos({ top: (rect?.bottom ?? 40) + 6, left, width });
    setQuery('');
    setResults([]);
    setStatus('idle');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function choose(c: CityResult) {
    onChange(toLocation(c));
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]); }
  }

  const hint: React.CSSProperties = {
    padding: '0.7rem 0.75rem', fontFamily: 'Cinzel, serif', fontSize: '0.68rem',
    letterSpacing: '0.06em', color: 'var(--moonsilver-dim)', textAlign: 'center',
  };

  const popup = (
    <div
      ref={popRef}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
        background: 'var(--night-elevated)',
        border: '1px solid var(--gold-dim)',
        borderRadius: '6px',
        padding: '0.6rem',
        zIndex: 99998,
        boxShadow: '0 16px 56px rgba(0,0,0,0.85)',
        animation: 'popupIn 0.15s ease',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Enter city name"
        aria-label="Search city"
        autoComplete="off"
        spellCheck={false}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--night-surface)',
          border: '1px solid var(--night-border)',
          borderRadius: '2px',
          color: 'var(--gold-light)',
          padding: '0.5rem 0.6rem',
          fontFamily: 'Cinzel, serif',
          fontSize: '16px', // 16px stops iOS zooming into the field
          outline: 'none',
        }}
      />

      <div style={{ marginTop: '0.4rem' }}>
        {status === 'idle' && <div style={hint}>Type at least 2 letters</div>}
        {status === 'loading' && <div style={hint}>Searching…</div>}
        {status === 'error' && <div style={{ ...hint, color: '#E07070' }}>Search unavailable. Please try again.</div>}
        {status === 'done' && results.length === 0 && <div style={hint}>No matching city</div>}
        {status === 'done' && results.length > 0 && (
          <ul
            ref={listRef}
            role="listbox"
            style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 260, overflowY: 'auto' }}
          >
            {results.map((c, i) => (
              <li
                key={c.geonameId}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
                style={{
                  padding: '0.5rem 0.6rem',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  background: i === active ? 'var(--night-surface)' : 'transparent',
                  color: c.geonameId === location.geonameId ? 'var(--gold)' : 'var(--gold-light)',
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.78rem',
                  letterSpacing: '0.03em',
                  lineHeight: 1.35,
                }}
              >
                {c.name}
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--moonsilver-dim)', letterSpacing: '0.06em' }}>
                  {c.timezone}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={openPopup}
        aria-label={`Change location, currently ${location.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change location"
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          minWidth: 0, maxWidth: '100%',
          fontFamily: 'Cinzel, serif',
          fontSize: 'clamp(0.52rem, 1.6vw, 0.68rem)',
          color: 'var(--moonsilver-dim)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location.name}</span>
      </button>
      {mounted && open && createPortal(popup, document.body)}
    </>
  );
}
