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

interface Interval { start: string; end: string; }

interface Props {
  muhurta: {
    brahmaMuhurta: Interval;
    abhijitMuhurta: Interval | null;
    godhuliMuhurta: Interval;
    amritKalam: Interval[];
    pratahSandhya: Interval;
    vijayaMuhurta: Interval;
    madhyahnaSandhya: Interval;
    sayahanaSandhya: Interval;
    nishitaMuhurta: Interval;
  };
  pageDate: string;
  earlyMorningMuhurta?: Record<string, any>;
}

const ORDER = [
  { key: 'abhijitMuhurta',  label: 'Abhijit Muhurta' },
  { key: 'vijayaMuhurta',   label: 'Vijaya Muhurta' },
  { key: 'amritKalam',      label: 'Amrit Kalam' },
  { key: 'brahmaMuhurta',   label: 'Brahma Muhurta' },
  { key: 'godhuliMuhurta',  label: 'Godhuli Muhurta' },
  { key: 'nishitaMuhurta',  label: 'Nishita Muhurta' },
  { key: 'pratahSandhya',   label: 'Pratah Sandhya' },
  { key: 'madhyahnaSandhya', label: 'Madhyahna Sandhya' },
  { key: 'sayahanaSandhya', label: 'Sayahana Sandhya' },
];

function MuhurtaRow({ infoKey, label, intervals, pageDate }: { infoKey: string; label: string; intervals: Interval[]; pageDate: string }) {
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
            <DateTag iso={iv.start} pageDate={pageDate} />{formatTime(iv.start)} — <DateTag iso={iv.end} pageDate={pageDate} />{formatTime(iv.end)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AuspiciousTime({ muhurta, pageDate, earlyMorningMuhurta }: Props) {
  return (
    <ExpandSection title="Auspicious Time" accentColor="var(--auspicious-text)">
      {ORDER.map(({ key, label }) => {
        const raw = (muhurta as any)[key];
        const earlyRaw = earlyMorningMuhurta?.[key];
        const earlyArr: Interval[] = earlyRaw ? (Array.isArray(earlyRaw) ? earlyRaw : [earlyRaw]) : [];
        const pageEndMs = getPageDayEndMs(pageDate);
        // Amrit Kalam is scoped by the API to the panchang day (sunrise→next sunrise),
        // so a window may legitimately start after calendar midnight (e.g. 01:25 AM next
        // day). Don't clip it at calendar midnight — DrikPanchang shows it on this day.
        const currentIntervals: Interval[] = (raw === null || (Array.isArray(raw) && raw.length === 0))
          ? []
          : (Array.isArray(raw) ? raw : [raw])
              .filter((iv: Interval) => key === 'amritKalam' || new Date(iv.start).getTime() < pageEndMs);
        const intervals: Interval[] = [...earlyArr, ...currentIntervals];
        if (intervals.length === 0) {
          return (
            <div key={key} className="time-chip" style={{ alignItems: 'center', gap: '0.4rem', opacity: 0.4 }}>
              <MuhurtaDot infoKey={key} />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.78rem, 2.5vw, 0.92rem)', fontWeight: 600, color: 'var(--moonsilver-dim)', letterSpacing: '0.04em', flex: 1, minWidth: 0 }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--moonsilver-dim)', fontStyle: 'italic', flexShrink: 0 }}>Not observed today</span>
            </div>
          );
        }
        return <MuhurtaRow key={key} infoKey={key} label={label} intervals={intervals} pageDate={pageDate} />;
      })}
    </ExpandSection>
  );
}
