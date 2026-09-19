'use client';
import InfoDot from '@/components/ui/InfoDot';
import MuhurtaPopup from '@/components/ui/MuhurtaPopup';
import DateTag from '@/components/ui/DateTag';
import ExpandSection from '@/components/ui/ExpandSection';
import { formatTime } from '@/lib/formatTime';
import { SPECIAL_YOGA_INFO } from '@/lib/data/descriptions';

function YogaDot({ infoKey }: { infoKey: string }) {
  const info = SPECIAL_YOGA_INFO[infoKey];
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
  specialYogas?: Record<string, Interval[]>;
  pageDate: string;
}

const ORDER = [
  { key: 'amritaSiddhi',    label: 'Amrita Siddhi' },
  { key: 'tripushkar',      label: 'Tripushkara' },
  { key: 'guruPushya',      label: 'Guru Pushya' },
  { key: 'raviPushya',      label: 'Ravi Pushya' },
  { key: 'dwipushkar',      label: 'Dwipushkara' },
  { key: 'sarvarthaSiddhi', label: 'Sarvartha Siddhi' },
  { key: 'raviYoga',        label: 'Ravi' },
];

function YogaRow({ infoKey, label, intervals, pageDate }: { infoKey: string; label: string; intervals: Interval[]; pageDate: string }) {
  return (
    <div className="time-chip" style={{ alignItems: 'center', gap: '0.4rem' }}>
      <YogaDot infoKey={infoKey} />
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

export default function SpecialYogas({ specialYogas, pageDate }: Props) {
  return (
    <ExpandSection title="Special Yogas" accentColor="var(--auspicious-text)">
      {ORDER.map(({ key, label }) => {
        const intervals: Interval[] = specialYogas?.[key] ?? [];
        if (intervals.length === 0) {
          return (
            <div key={key} className="time-chip" style={{ alignItems: 'center', gap: '0.4rem', opacity: 0.4 }}>
              <YogaDot infoKey={key} />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.78rem, 2.5vw, 0.92rem)', fontWeight: 600, color: 'var(--moonsilver-dim)', letterSpacing: '0.04em', flex: 1, minWidth: 0 }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--moonsilver-dim)', fontStyle: 'italic', flexShrink: 0 }}>Not observed today</span>
            </div>
          );
        }
        return <YogaRow key={key} infoKey={key} label={label} intervals={intervals} pageDate={pageDate} />;
      })}
    </ExpandSection>
  );
}
