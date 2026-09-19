'use client';
import { MiniPopup } from '@/components/ui/PopupContent';
import type { MuhurtaInfo } from '@/lib/data/descriptions';

/**
 * Muhurta popup body (rendered as InfoDot's `briefNode` in descriptionOnly mode).
 * Title = name + bracket: `(+bonus)` for auspicious muhurtas, `(x0)` for inauspicious.
 * Clicking the name opens its Nature. A colored box shows the Traditional Classification,
 * with the Commercial Significance shown directly below.
 */
export default function MuhurtaPopup({ info }: { info: MuhurtaInfo }) {
  const bracket = typeof info.bonus === 'number' ? `(+${info.bonus})` : `(x${info.penalty ?? 0})`;
  return (
    <div style={{ minWidth: 240 }}>
      {/* Title: clickable name → Nature, with the bonus/penalty bracket beside it */}
      <div className="popup-title" style={{ marginBottom: '0.55rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <MiniPopup
          title={info.name}
          body={<><strong style={{ color: 'var(--gold-light)' }}>Nature:</strong> {info.nature}</>}
          trigger={<span style={{ borderBottom: '1px dotted var(--gold-dim)' }}>{info.name}</span>}
        />
        <span style={{ color: 'var(--moonsilver-dim)', fontWeight: 400 }}> {bracket}</span>
      </div>

      {/* Traditional classification box (green if auspicious, red if inauspicious) */}
      <span
        className={`popup-badge ${info.isAuspicious ? 'auspicious' : 'inauspicious'}`}
        style={{ display: 'block', textAlign: 'center', marginBottom: '0.55rem' }}
      >
        {info.auspiciousness}
      </span>

      {/* Commercial Significance: the dot/label opens the description (like Tithi) */}
      <MiniPopup
        width={320}
        body={info.reason}
        trigger={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold-light)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.92rem', color: 'var(--moonsilver)' }}>Commercial Significance</span>
          </span>
        }
      />
    </div>
  );
}
