'use client';
import InfoDot from '@/components/ui/InfoDot';
import PopupContent from '@/components/ui/PopupContent';
import DateTag from '@/components/ui/DateTag';
import ExpandSection from '@/components/ui/ExpandSection';
import { formatTime, getPageDayEndMs } from '@/lib/formatTime';
import { MUHURTA_INFO } from '@/lib/data/descriptions';

function MuhurtaDot({ infoKey, cutLines }: { infoKey: string; cutLines?: string[] }) {
  const info = MUHURTA_INFO[infoKey];
  if (!info) return null;
  return (
    <InfoDot
      title={info.name}
      brief=""
      briefNode={
        <>
          <PopupContent auspiciousness={info.auspiciousness} isAuspicious={info.isAuspicious} reason={info.reason} />
          {cutLines && cutLines.length > 0 && (
            <div style={{ marginTop: '0.45rem', fontSize: '0.76rem', color: 'var(--inauspicious-text)', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
              {cutLines.join('\n')}
            </div>
          )}
        </>
      }
      isAuspicious={null}
    />
  );
}

interface Interval { start: string; end: string; }

const AUSPICIOUS_ORDER = [
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

const INAUSPICIOUS_ORDER = [
  { key: 'gulikaKalam', label: 'Gulika Kalam' },
  { key: 'yamaGanda',   label: 'Yama Ganda' },
  { key: 'rahuKalam',   label: 'Rahu Kalam' },
  { key: 'varjyam',     label: 'Varjyam' },
  { key: 'baana',       label: 'Baana' },
  { key: 'vidalYoga',   label: 'Vidal Yoga' },
  { key: 'durMuhurta',  label: 'Dur Muhurta' },
  { key: 'bhadra',      label: 'Bhadra' },
];

function toMs(iv: Interval) {
  return { start: new Date(iv.start).getTime(), end: new Date(iv.end).getTime() };
}

function intervalsOverlap(a: Interval, b: Interval): boolean {
  const as = new Date(a.start).getTime(), ae = new Date(a.end).getTime();
  const bs = new Date(b.start).getTime(), be = new Date(b.end).getTime();
  return as < be && ae > bs;
}

function subtractAll(auspicious: Interval, bad: Interval[]): Interval[] {
  let segments = [toMs(auspicious)];
  for (const b of bad) {
    const bms = toMs(b);
    const next: typeof segments = [];
    for (const seg of segments) {
      if (bms.end <= seg.start || bms.start >= seg.end) {
        next.push(seg);
      } else {
        if (bms.start > seg.start) next.push({ start: seg.start, end: bms.start });
        if (bms.end < seg.end) next.push({ start: bms.end, end: seg.end });
      }
    }
    segments = next;
  }
  return segments
    .filter(s => s.end - s.start >= 60000)
    .map(s => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() }));
}

function findOverlaps(src: Interval, muhurta: Record<string, any>): Array<{ label: string; interval: Interval }> {
  const overlaps: Array<{ label: string; interval: Interval }> = [];
  for (const { key, label } of INAUSPICIOUS_ORDER) {
    const raw = muhurta[key];
    const arr: Interval[] = Array.isArray(raw) ? raw : [raw];
    for (const iv of arr) {
      if (intervalsOverlap(src, iv)) {
        overlaps.push({ label, interval: iv });
      }
    }
  }
  return overlaps;
}

interface Props { muhurta: Record<string, any>; pageDate: string; earlyMorningMuhurta?: Record<string, any>; }

function mergeAdjacent(ivs: Interval[]): Interval[] {
  if (ivs.length < 2) return ivs;
  const sorted = [...ivs].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const merged: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const gap = new Date(sorted[i].start).getTime() - new Date(prev.end).getTime();
    if (gap <= 120_000) {
      const end = new Date(sorted[i].end).getTime() > new Date(prev.end).getTime() ? sorted[i].end : prev.end;
      merged[merged.length - 1] = { ...prev, end };
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

export default function NonOverlappingTime({ muhurta, pageDate, earlyMorningMuhurta }: Props) {
  const pageEndMs = getPageDayEndMs(pageDate);

  const rawBad: Interval[] = [];
  for (const { key } of INAUSPICIOUS_ORDER) {
    const earlyRaw = earlyMorningMuhurta?.[key];
    if (earlyRaw) {
      const earlyArr: Interval[] = Array.isArray(earlyRaw) ? earlyRaw : [earlyRaw];
      rawBad.push(...earlyArr);
    }
    const raw = muhurta[key];
    if (raw !== null) {
      const arr: Interval[] = Array.isArray(raw) ? raw : [raw];
      rawBad.push(...arr.filter((iv: Interval) => new Date(iv.start).getTime() < pageEndMs));
    }
  }
  // Merge adjacent fragments (e.g. Vidal spanning midnight into the same nakshatra window)
  const badIntervals = mergeAdjacent(rawBad);

  return (
    <ExpandSection title="Non-Overlapped Auspicious Times" accentColor="var(--auspicious-text)">
      {AUSPICIOUS_ORDER.map(({ key, label }) => {
        const raw = muhurta[key];
        const earlyAuspRaw = earlyMorningMuhurta?.[key];
        const earlyAuspArr: Interval[] = earlyAuspRaw ? (Array.isArray(earlyAuspRaw) ? earlyAuspRaw : [earlyAuspRaw]) : [];
        const currentArr: Interval[] = (raw === null || (Array.isArray(raw) && raw.length === 0))
          ? []
          : (Array.isArray(raw) ? raw : [raw])
              .filter((iv: Interval) => new Date(iv.start).getTime() < pageEndMs);
        const src: Interval[] = [...earlyAuspArr, ...currentArr];
        if (src.length === 0) {
          return (
            <div key={key} className="time-chip" style={{ alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
              <MuhurtaDot infoKey={key} />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.78rem, 2.5vw, 0.92rem)', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.04em', flex: 1, minWidth: 0, wordBreak: 'break-word', paddingLeft: '0.6em', textIndent: '-0.6em' }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--moonsilver-dim)', fontStyle: 'italic', flexShrink: 0 }}>Not available today</span>
            </div>
          );
        }
        const clean: Interval[] = src.flatMap(iv => subtractAll(iv, badIntervals));
        const overlaps = src.flatMap(iv => findOverlaps(iv, muhurta));
        const uniqueOverlaps = overlaps.filter((o, i, arr) => arr.findIndex(x => x.label === o.label) === i);
        const cutLines = uniqueOverlaps
          .map(o => `✗ Cut by ${o.label}: ${formatTime(o.interval.start)} – ${formatTime(o.interval.end)}`);

        return (
          <div key={key} className="time-chip" style={{ alignItems: 'center', gap: '0.4rem' }}>
            <MuhurtaDot infoKey={key} cutLines={cutLines} />
            <span style={{
              fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.78rem, 2.5vw, 0.92rem)',
              fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.04em',
              flex: 1, minWidth: 0, wordBreak: 'break-word',
              paddingLeft: '0.6em', textIndent: '-0.6em',
            }}>{label}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
              {clean.length === 0 ? (
                <span style={{ fontSize: '0.82rem', color: 'var(--moonsilver-dim)', fontStyle: 'italic' }}>No clean window today</span>
              ) : (
                clean.map((iv, i) => (
                  <span key={i} style={{
                    fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.7rem, 2vw, 0.82rem)',
                    fontWeight: 600, color: 'var(--moonsilver)', whiteSpace: 'nowrap',
                  }}>
                    <DateTag iso={iv.start} pageDate={pageDate} />{formatTime(iv.start)} — <DateTag iso={iv.end} pageDate={pageDate} />{formatTime(iv.end)}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}
    </ExpandSection>
  );
}
