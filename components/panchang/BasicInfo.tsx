'use client';
import InfoDot from '@/components/ui/InfoDot';
import TithiPopup from '@/components/ui/TithiPopup';
import DateTag from '@/components/ui/DateTag';
import MoonCycleTag from '@/components/ui/MoonCycleTag';
import ExpandSection from '@/components/ui/ExpandSection';
import { formatTime, stepDate, formatDateDisplay } from '@/lib/formatTime';
import {
  ELEMENT_TYPES, TITHIS, NAKSHATRAS, YOGAS, KARANAS, VARAS,
  type ScoredElement, type TithiScore,
} from '@/lib/data/descriptions';

interface Props { data: any; pageDate: string; }

interface Slot {
  name: string;
  paksha?: string;
  pada?: number;
  isAuspicious?: boolean;
  start: string | null;
  end: string | null;
  startReal?: string;
  endReal?: string;
}

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Show the real (unclipped) transition times. start/end are null when a slot is
// capped at the calendar-day boundary; startReal/endReal hold the actual cross
// time (often on the prev/next day), and DateTag adds the "#" tag for those.
function SlotTime({ slot, pageDate }: { slot: Slot; pageDate: string }) {
  const startIso = slot.start ?? slot.startReal ?? null;
  const endIso = slot.end ?? slot.endReal ?? null;
  return (
    <>
      <DateTag iso={startIso} pageDate={pageDate} />{startIso ? formatTime(startIso) : '—'} – <DateTag iso={endIso} pageDate={pageDate} />{endIso ? formatTime(endIso) : '—'}
    </>
  );
}

function nameColor(isAuspicious: boolean | null | undefined): string | undefined {
  if (isAuspicious === true)  return 'var(--auspicious-text)';
  if (isAuspicious === false) return 'var(--inauspicious-text)';
  return undefined;
}

function borderColor(isAuspicious: boolean | null | undefined): string {
  if (isAuspicious === true)  return 'var(--auspicious-text)';
  if (isAuspicious === false) return 'var(--inauspicious-text)';
  return 'rgba(200,150,26,0.35)';
}

interface PopupSpec { node: React.ReactNode; badge: boolean | null; descriptionOnly?: boolean; popupMaxWidth?: number }

function ElementRow({ label, labelDotKey, slots, getAusp, getPopup, valueText, pageDate }: {
  label: string;
  labelDotKey?: string;
  slots: Slot[];
  getAusp: (slot: Slot) => boolean | null;
  getPopup: (slot: Slot) => PopupSpec | null;
  valueText?: (slot: Slot) => string | undefined;
  pageDate: string;
}) {
  const labelInfo = labelDotKey ? ELEMENT_TYPES[labelDotKey] : null;

  return (
    <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid rgba(128,100,50,0.1)', marginBottom: '0.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '0.35rem', gap: '0.4rem' }}>
        <div className="info-label" style={{ minWidth: 90, flexShrink: 0 }}>
          {labelInfo && <InfoDot title={labelInfo.label} brief={labelInfo.brief} large />}
          {label}
        </div>
      </div>

      {slots.map((slot, i) => {
        const displayName = slot.paksha ? `${slot.paksha} ${slot.name}` : slot.name;
        const ausp = getAusp(slot);
        const popup = getPopup(slot);
        const color = nameColor(ausp);
        const rightText = valueText?.(slot);
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '0.5rem',
            paddingLeft: '0.6rem', paddingTop: '0.2rem',
            borderLeft: `2px solid ${borderColor(ausp)}`,
            marginLeft: '0.3rem', marginTop: '0.15rem',
            minWidth: 0,
          }}>
            <span style={{
              flex: 1, minWidth: 0,
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
              fontWeight: 600,
              color: color ?? 'var(--moonsilver)',
              letterSpacing: '0.02em',
              wordBreak: 'break-word',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}>
              {popup && (
                <InfoDot title={displayName} brief="" briefNode={popup.node} isAuspicious={popup.badge} descriptionOnly={popup.descriptionOnly} popupMaxWidth={popup.popupMaxWidth} />
              )}
              {displayName}
            </span>
            <span style={{
              flexShrink: 0,
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(0.7rem, 2vw, 0.78rem)',
              fontWeight: 600,
              color: 'var(--moonsilver-dim)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}>
              {rightText !== undefined ? rightText : <SlotTime slot={slot} pageDate={pageDate} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SunMoonRow({ label, iso, pageDate, prefixEl, noBorder }: { label: string; iso: string | null | undefined; pageDate: string; prefixEl?: React.ReactNode; noBorder?: boolean }) {
  return (
    <div className="info-row" style={noBorder ? { borderBottom: 'none' } : undefined}>
      <div className="info-label">{label}</div>
      <div className="info-value" style={{ fontFamily: 'Cinzel, serif', fontSize: '0.95rem', color: 'var(--gold-light)' }}>
        {prefixEl}<DateTag iso={iso} pageDate={pageDate} />{iso ? formatTime(iso) : '—'}
      </div>
    </div>
  );
}

function SimpleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}

// Build the rich scored-element popup (Tithi/Vara/Nakshatra/Yoga/Karana).
function scoredPopup(name: string, el: ScoredElement | undefined): PopupSpec | null {
  if (!el) return null;
  return { node: <TithiPopup name={name} info={el} />, badge: null, descriptionOnly: true, popupMaxWidth: 320 };
}

export default function BasicInfo({ data, pageDate }: Props) {
  const { tithi, nakshatra, yoga, karana, vara, sunMoonTimes, moonSign, suryaNakshatra, transitions } = data;

  const { moonrise, moonset } = sunMoonTimes;
  const moonsetFromPrevCycle =
    !!moonset && (!moonrise || new Date(moonset).getTime() < new Date(moonrise).getTime());
  const moonroseOnDate = moonsetFromPrevCycle
    ? formatDateDisplay(stepDate(pageDate, -1))
    : null;

  const tithiSlots: Slot[] = transitions?.tithi?.length
    ? transitions.tithi
    : [{ name: tithi.name, paksha: tithi.paksha, start: null, end: null }];

  const nakshatraSlots: Slot[] = transitions?.nakshatra?.length
    ? transitions.nakshatra
    : [{ name: nakshatra.name, pada: nakshatra.pada, start: null, end: null }];

  const yogaSlots: Slot[] = transitions?.yoga?.length
    ? transitions.yoga
    : [{ name: yoga.name, isAuspicious: yoga.isAuspicious, start: null, end: null }];

  const karanaSlots: Slot[] = transitions?.karana?.length
    ? transitions.karana
    : [{ name: karana.name, start: null, end: null }];

  const varaSlots: Slot[] = [{ name: vara.name, start: null, end: null }];

  // Tithi data is keyed by "<Paksha> <Name>"; Purnima/Amavasya fall back to bare name.
  const tithiOf = (slot: Slot): TithiScore | undefined =>
    TITHIS[`${slot.paksha} ${slot.name}`] ?? TITHIS[slot.name];

  return (
    <ExpandSection title="Basic Info" defaultOpen={false}>
      <SunMoonRow label="Sunrise"  iso={sunMoonTimes.sunrise}  pageDate={pageDate} noBorder />
      <SunMoonRow label="Sunset"   iso={sunMoonTimes.sunset}   pageDate={pageDate} />
      <SunMoonRow label="Moonrise" iso={sunMoonTimes.moonrise} pageDate={pageDate} noBorder />
      <SunMoonRow label="Moonset"  iso={sunMoonTimes.moonset}  pageDate={pageDate} prefixEl={moonroseOnDate ? <MoonCycleTag roseOnDate={moonroseOnDate} /> : undefined} />

      <ElementRow label="Tithi" labelDotKey="tithi" slots={tithiSlots} pageDate={pageDate}
        getAusp={s => tithiOf(s)?.isAuspicious ?? null}
        getPopup={s => scoredPopup(s.paksha ? `${s.paksha} ${s.name}` : s.name, tithiOf(s))} />

      <ElementRow label="Vara" labelDotKey="vara" slots={varaSlots} pageDate={pageDate}
        getAusp={s => VARAS[s.name]?.isAuspicious ?? null}
        getPopup={s => scoredPopup(s.name, VARAS[s.name])}
        valueText={() => WEEKDAYS_EN[vara.index] ?? ''} />

      <ElementRow label="Nakshatra" labelDotKey="nakshatra" slots={nakshatraSlots} pageDate={pageDate}
        getAusp={s => NAKSHATRAS[s.name]?.isAuspicious ?? null}
        getPopup={s => scoredPopup(s.name, NAKSHATRAS[s.name])} />

      <ElementRow label="Yoga" labelDotKey="yoga" slots={yogaSlots} pageDate={pageDate}
        getAusp={s => YOGAS[s.name]?.isAuspicious ?? null}
        getPopup={s => scoredPopup(s.name, YOGAS[s.name])} />

      <ElementRow label="Karana" labelDotKey="karana" slots={karanaSlots} pageDate={pageDate}
        getAusp={s => KARANAS[s.name]?.isAuspicious ?? null}
        getPopup={s => scoredPopup(s.name, KARANAS[s.name])} />

      <p className="sub-label" style={{ marginTop: '1rem' }}>☽ Rashi &amp; Nakshatra</p>
      <SimpleRow label="Moon Sign"       value={moonSign} />
      <SimpleRow label="Surya Nakshatra" value={suryaNakshatra} />
    </ExpandSection>
  );
}
