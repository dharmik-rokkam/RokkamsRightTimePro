'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ExpandSection from '@/components/ui/ExpandSection';
import InfoDot from '@/components/ui/InfoDot';
import { MiniPopup } from '@/components/ui/PopupContent';
import DateTag from '@/components/ui/DateTag';
import { formatTime, getPageDayEndMs } from '@/lib/formatTime';
import { computeCategorySlots, type CategoryDef, type CategorySlot } from '@/lib/categoryScore';

const CLOSE_ALL = 'infodot:closeAll';
const STAR_PATH = 'M12 2l2.55 7.85H22l-6.27 4.56 2.39 7.37L12 17.27l-6.12 4.51 2.39-7.37L2 9.85h7.45z';
const STAR_STYLE: React.CSSProperties = { display: 'inline-block', verticalAlign: '-0.15em', filter: 'brightness(var(--star-brightness, 0.95))' };

function FullStar() {
  return <svg width="1em" height="1em" viewBox="0 0 24 24" style={STAR_STYLE} aria-hidden><path d={STAR_PATH} fill="#f5c518" stroke="#f5c518" strokeWidth="0.5" strokeLinejoin="round" /></svg>;
}
function HalfStar() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" style={STAR_STYLE} aria-hidden>
      <defs><clipPath id="cr-hs"><rect x="0" y="0" width="12" height="24" /></clipPath></defs>
      <path d={STAR_PATH} fill="none" stroke="#f5c518" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={STAR_PATH} fill="#f5c518" clipPath="url(#cr-hs)" />
    </svg>
  );
}
function StarDisplay({ count, size = '1rem' }: { count: number; size?: string }) {
  const full = Math.floor(count);
  const half = count % 1 >= 0.5;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', fontSize: size }}>
      {Array.from({ length: full }, (_, i) => <FullStar key={i} />)}
      {half && <HalfStar />}
    </span>
  );
}

function rankClass(i: number) { return i < 3 ? `rank-${i + 1}` : 'rank-n'; }

function StarLegend() {
  const rows = [
    { count: 5,   label: 'Excellent', range: '95+' },
    { count: 4.5, label: 'Very Good', range: '85–94' },
    { count: 4,   label: 'Good',      range: '75–84' },
    { count: 3,   label: 'Average',   range: '65–74' },
    { count: 2,   label: 'Below Avg', range: '50–64' },
    { count: 1,   label: 'Poor',      range: '<50' },
  ];
  return (
    <div style={{ lineHeight: 1.9 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <StarDisplay count={r.count} size="0.7rem" />
          <span style={{ color: 'var(--moonsilver)', fontSize: '0.78rem', flex: 1 }}>{r.label}</span>
          <span style={{ color: 'var(--moonsilver-dim)', fontSize: '0.68rem' }}>{r.range}</span>
        </div>
      ))}
    </div>
  );
}

// Combine the day's muhurta with the previous day's early-morning overflow so
// pre-sunrise windows see the right dosha/auspicious intervals.
function mergeMuhurta(muhurta: Record<string, any>, early?: Record<string, any>): Record<string, any> {
  if (!early) return muhurta;
  const out: Record<string, any> = { ...muhurta };
  for (const [k, raw] of Object.entries(early)) {
    if (!raw) continue;
    const a = muhurta[k] == null ? [] : (Array.isArray(muhurta[k]) ? muhurta[k] : [muhurta[k]]);
    const b = Array.isArray(raw) ? raw : [raw];
    out[k] = [...a, ...b];
  }
  return out;
}

// A name that opens its description (max ~3 lines) on click. Plain text if no description.
function NameLink({ text, description, color }: { text: string; description?: string; color?: string }) {
  if (!description) return <span style={{ color }}>{text}</span>;
  return (
    <MiniPopup
      width={320}
      body={description}
      trigger={<span style={{ color, borderBottom: '1px dotted var(--gold-dim)', cursor: 'pointer' }}>{text}</span>}
    />
  );
}

// A group (Special Yogas / Muhurtas / Doshas) framed by a top divider + label.
function Group({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean);
  return (
    <div style={{ borderTop: '1px solid var(--night-border)', marginTop: '0.35rem', paddingTop: '0.28rem' }}>
      <div style={{ color: 'var(--moonsilver-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{label}</div>
      {hasItems ? children : <span style={{ color: 'var(--moonsilver-dim)', fontSize: '0.7rem', fontStyle: 'italic' }}>None</span>}
    </div>
  );
}

function GroupRow({ prefix, name, description, right, color }: { prefix: string; name: string; description?: string; right: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
      <span style={{ color, fontFamily: 'Cinzel, serif', fontSize: '0.68rem' }}>{prefix}<NameLink text={name} description={description} color={color} /></span>
      <span style={{ color, fontFamily: 'Cinzel, serif', fontWeight: 700 }}>{right}</span>
    </div>
  );
}

function Breakdown({ slot, rank }: { slot: CategorySlot; rank: number }) {
  return (
    <div style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ color: 'var(--gold)', fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 700 }}>#{rank}</span>
        <span style={{ color: 'var(--moonsilver)', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', fontWeight: 600 }}>
          Score: <span style={{ color: 'var(--gold-light)' }}>{slot.finalScore}</span>
        </span>
      </div>
      <div style={{ borderTop: '1px solid var(--night-border)', marginBottom: '0.35rem' }} />
      {slot.elements.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.1rem' }}>
          <span style={{ color: 'var(--moonsilver-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.68rem', width: 64, flexShrink: 0 }}>{r.label}</span>
          <span style={{ flex: 1, minWidth: 0 }}><NameLink text={r.name} description={r.description} color="var(--moonsilver)" /></span>
          <span style={{ color: 'var(--gold-light)', fontFamily: 'Cinzel, serif', fontWeight: 700, flexShrink: 0 }}>{r.score}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--night-border)', marginTop: '0.35rem', paddingTop: '0.28rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: 'var(--moonsilver-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.68rem' }}>Base Score</span>
        <span style={{ color: 'var(--gold-light)', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', fontWeight: 600 }}>{slot.baseScore}</span>
      </div>
      <Group label="Special Yogas" color="var(--auspicious-text)">
        {slot.specialYogaBonuses.map((b, i) => (
          <GroupRow key={i} color="var(--auspicious-text)" prefix="✦ " name={b.label} description={b.description} right={`+${b.points}`} />
        ))}
      </Group>
      <Group label="Muhurtas" color="var(--auspicious-text)">
        {slot.muhurtaBonuses.map((b, i) => (
          <GroupRow key={i} color="var(--auspicious-text)" prefix="✦ " name={b.label} description={b.description} right={`+${b.points}`} />
        ))}
      </Group>
      <Group label="Doshas" color="var(--inauspicious-text)">
        {slot.doshas.map((d, i) => (
          <GroupRow key={i} color="var(--inauspicious-text)" prefix="✗ " name={d.label} description={d.description} right={`×${d.mult}`} />
        ))}
      </Group>
    </div>
  );
}

interface Props {
  category: CategoryDef;
  transitions: any;
  muhurta: Record<string, any>;
  specialYogas: Record<string, any>;
  varaName: string;
  paksha: string;
  pageDate: string;
  earlyMorningMuhurta?: Record<string, any>;
}

export default function CategoryResult({ category, transitions, muhurta, specialYogas, varaName, paksha, pageDate, earlyMorningMuhurta }: Props) {
  const pageEndMs = getPageDayEndMs(pageDate);
  const mergedMuhurta = mergeMuhurta(muhurta, earlyMorningMuhurta);
  const slots = computeCategorySlots({
    field: category.key, weights: category.w, transitions,
    muhurta: mergedMuhurta, specialYogas: specialYogas ?? {}, varaName, paksha, dayEndMs: pageEndMs,
  }).filter(s => s.start < pageEndMs);

  const [popup, setPopup] = useState<{ index: number; pos: { top: number; left: number } } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleCloseAll() { setPopup(null); }
    document.addEventListener(CLOSE_ALL, handleCloseAll);
    return () => document.removeEventListener(CLOSE_ALL, handleCloseAll);
  }, []);

  useEffect(() => {
    if (!popup) return;
    function close() { setPopup(null); }
    function outside(e: MouseEvent) { if (!popupRef.current?.contains(e.target as Node)) setPopup(null); }
    function touchOutside(e: TouchEvent) { if (!popupRef.current?.contains(e.target as Node)) setPopup(null); }
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
    document.dispatchEvent(new CustomEvent(CLOSE_ALL));
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 280, H = 240;
    let left = rect.left;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + H > window.innerHeight - 8) top = rect.top - H - 6;
    if (top < 8) top = 8;
    setPopup(prev => prev?.index === index ? null : { index, pos: { top, left } });
  }

  const legend = (
    <span onClick={e => e.stopPropagation()}>
      <InfoDot title="" brief="" briefNode={<StarLegend />} descriptionOnly label="?" />
    </span>
  );

  return (
    <ExpandSection title={`Result - ${category.label}`} accentColor="var(--gold-light)" titleExtra={legend}>
      {slots.length === 0 ? (
        <p style={{ color: 'var(--moonsilver-dim)', fontStyle: 'italic', fontSize: '0.88rem' }}>No qualifying windows today.</p>
      ) : (
        <>
          {(showAll ? slots : slots.slice(0, 5)).map((slot, i) => {
            const startIso = new Date(slot.start).toISOString();
            const endIso = new Date(Math.min(slot.end, pageEndMs - 60_000)).toISOString();
            return (
              <div key={i} className="time-chip" style={{ alignItems: 'center', gap: '0.6rem' }}>
                <span
                  className={`rank-badge ${rankClass(i)}`}
                  onClick={e => openPopup(e, i)}
                  onTouchEnd={e => openPopup(e as any, i)}
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onKeyDown={e => e.key === 'Enter' && openPopup(e as any, i)}
                >{i + 1}</span>
                <span className="time-range">
                  <DateTag iso={startIso} pageDate={pageDate} />{formatTime(startIso)} — <DateTag iso={endIso} pageDate={pageDate} />{formatTime(endIso)}
                </span>
                <StarDisplay count={slot.starCount} size="1rem" />
              </div>
            );
          })}
          {slots.length > 5 && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ marginTop: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--moonsilver-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.68rem', letterSpacing: '0.08em', padding: '0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <span style={{ transform: showAll ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
              {showAll ? 'Show less' : `Show ${slots.length - 5} more`}
            </button>
          )}
        </>
      )}

      {mounted && popup && slots[popup.index] && createPortal(
        <div
          ref={popupRef}
          className="info-popup"
          style={{ top: popup.pos.top, left: popup.pos.left, position: 'fixed', zIndex: 99999, width: 280, minWidth: 220 }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <Breakdown slot={slots[popup.index]} rank={popup.index + 1} />
        </div>,
        document.body,
      )}
    </ExpandSection>
  );
}
