'use client';
import InfoDot from '@/components/ui/InfoDot';
import MuhurtaPopup from '@/components/ui/MuhurtaPopup';
import DateTag from '@/components/ui/DateTag';
import ExpandSection from '@/components/ui/ExpandSection';
import { formatTime, getPageDayEndMs } from '@/lib/formatTime';
import { MUHURTA_INFO } from '@/lib/data/descriptions';

function MuhurtaDot({ infoKey }: { infoKey: string }) {
  const info = MUHURTA_INFO[infoKey];
  if (!info) return null;
  return (
    <InfoDot
      title={info.name}
      brief=""
      briefNode={<MuhurtaPopup info={info} />}
      isAuspicious={null}
      descriptionOnly
      popupMaxWidth={320}
    />
  );
}

interface Interval { start: string; end: string; label?: string; }

interface Props {
  muhurta: {
    rahuKalam: Interval;
    gulikaKalam: Interval;
    varjyam: Interval[];
    baana: Interval[];
    yamaGanda: Interval;
    vidalYoga: Interval[];
    durMuhurta: Interval[];
    bhadra: Interval[];
  };
  pageDate: string;
  earlyMorningMuhurta?: Record<string, any>;
}

const ORDER = [
  { key: 'gulikaKalam', label: 'Gulika Kalam' },
  { key: 'yamaGanda',   label: 'Yama Ganda' },
  { key: 'rahuKalam',   label: 'Rahu Kalam' },
  { key: 'varjyam',     label: 'Varjyam' },
  { key: 'baana',       label: 'Baana' },
  { key: 'vidalYoga',   label: 'Vidal Yoga' },
  { key: 'durMuhurta',  label: 'Dur Muhurta' },
  { key: 'bhadra',      label: 'Bhadra' },
];

function BadRow({ infoKey, label, intervals, pageDate }: { infoKey: string; label: string; intervals: Interval[]; pageDate: string }) {
  return (
    <div className="time-chip" style={{ alignItems: 'center', gap: '0.4rem' }}>
      <MuhurtaDot infoKey={infoKey} />
      <span style={{
        fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.78rem, 2.5vw, 0.92rem)',
        fontWeight: 600, color: 'var(--gold-light)', letterSpacing: '0.04em',
        flex: 1, minWidth: 0, wordBreak: 'break-word',
        paddingLeft: '0.6em', textIndent: '-0.6em',
      }}>{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
        {intervals.map((iv, i) => (
          <span key={i} style={{
            fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.7rem, 2vw, 0.82rem)',
            fontWeight: 600, color: 'var(--moonsilver)', whiteSpace: 'nowrap',
          }}>
            {iv.label ? `${iv.label}: ` : ''}<DateTag iso={iv.start} pageDate={pageDate} />{formatTime(iv.start)} — <DateTag iso={iv.end} pageDate={pageDate} />{formatTime(iv.end)}
          </span>
        ))}
      </div>
    </div>
  );
}

function mergeAdjacent(ivs: Interval[]): Interval[] {
  if (ivs.length < 2) return ivs;
  const sorted = [...ivs].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const merged: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const gap = new Date(sorted[i].start).getTime() - new Date(prev.end).getTime();
    // Only merge if same label (or both unlabeled) — prevents Mrityu+Agni Baana from collapsing
    if (gap <= 120_000 && sorted[i].label === prev.label) {
      const end = new Date(sorted[i].end).getTime() > new Date(prev.end).getTime() ? sorted[i].end : prev.end;
      merged[merged.length - 1] = { ...prev, end };
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

export default function InauspiciousTime({ muhurta, pageDate, earlyMorningMuhurta }: Props) {
  return (
    <ExpandSection title="Inauspicious Time" accentColor="var(--inauspicious-text)">
      {ORDER.map(({ key, label }) => {
        const raw = (muhurta as any)[key];
        const earlyRaw = earlyMorningMuhurta?.[key];
        const earlyArr: Interval[] = earlyRaw ? (Array.isArray(earlyRaw) ? earlyRaw : [earlyRaw]) : [];
        const pageEndMs = getPageDayEndMs(pageDate);
        // Baana, Bhadra, Varjyam and Vidal Yoga are scoped to the panchang day
        // (sunrise→next sunrise), so a window may legitimately start after calendar
        // midnight — don't clip those at midnight.
        const isPanchangDayItem = key === 'baana' || key === 'bhadra' || key === 'varjyam' || key === 'vidalYoga' || key === 'durMuhurta';
        const currentIntervals: Interval[] = raw === null ? [] : (Array.isArray(raw) ? raw : [raw])
          .filter((iv: Interval) => isPanchangDayItem || new Date(iv.start).getTime() < pageEndMs);
        const intervals: Interval[] = mergeAdjacent([...earlyArr, ...currentIntervals]);
        if (intervals.length === 0) {
          return (
            <div key={key} className="time-chip" style={{ alignItems: 'center', gap: '0.4rem', opacity: 0.4 }}>
              <MuhurtaDot infoKey={key} />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.78rem, 2.5vw, 0.92rem)', fontWeight: 600, color: 'var(--moonsilver-dim)', letterSpacing: '0.04em', flex: 1, minWidth: 0 }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--moonsilver-dim)', fontStyle: 'italic', flexShrink: 0 }}>Not observed today</span>
            </div>
          );
        }
        return <BadRow key={key} infoKey={key} label={label} intervals={intervals} pageDate={pageDate} />;
      })}
    </ExpandSection>
  );
}
