'use client';
import { MiniPopup } from '@/components/ui/PopupContent';
import type { TithiScore } from '@/lib/data/descriptions';

// The five scored categories, in display order. `short` is the compact column
// label shown in the main box; `full` is the category name in its sub-popup.
const SCORE_CELLS: { key: 'general' | 'bid' | 'contract' | 'newVentures' | 'financial'; short: string; full: string }[] = [
  { key: 'general',     short: 'Gen', full: 'General' },
  { key: 'bid',         short: 'Bid', full: 'Bid Submission' },
  { key: 'contract',    short: 'Con', full: 'Contract Execution' },
  { key: 'newVentures', short: 'New', full: 'New Ventures' },
  { key: 'financial',   short: 'Fin', full: 'Financial Activities' },
];

/**
 * Rich Tithi popup body (rendered as InfoDot's `briefNode` in descriptionOnly mode).
 * Title shows "Name (Group)"; the name opens its Nature; each score opens its
 * classification; the bullet opens the Commercial Significance description.
 */
export default function TithiPopup({ name, info }: { name: string; info: TithiScore }) {
  return (
    <div style={{ minWidth: 290 }}>
      {/* Title: clickable name → Nature, with (Group) beside it — kept on one line */}
      <div className="popup-title" style={{ marginBottom: '0.6rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <MiniPopup
          title={name}
          body={<><strong style={{ color: 'var(--gold-light)' }}>Nature:</strong> {info.nature}</>}
          trigger={<span style={{ borderBottom: '1px dotted var(--gold-dim)' }}>{name}</span>}
        />
        {info.tag ? <span style={{ color: 'var(--moonsilver-dim)', fontWeight: 400 }}> ({info.tag})</span> : null}
      </div>

      {/* Five scores: each opens its classification */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.35rem', marginBottom: '0.65rem' }}>
        {SCORE_CELLS.map(c => {
          const cat = info[c.key];
          return (
            <MiniPopup
              key={c.key}
              title={c.full}
              width={190}
              body={cat.classification}
              trigger={
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.12rem' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--moonsilver-dim)', letterSpacing: '0.02em' }}>{c.short}</span>
                  <span style={{
                    fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '1.05rem',
                    color: 'var(--gold-light)', borderBottom: '1px dotted var(--gold-dim)', lineHeight: 1.2,
                  }}>{cat.score}</span>
                </span>
              }
            />
          );
        })}
      </div>

      {/* Commercial Significance: the dot (or label) opens the description */}
      <MiniPopup
        width={320}
        body={info.significance}
        trigger={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: 'var(--gold-light)', flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.92rem', color: 'var(--moonsilver)' }}>Commercial Significance</span>
          </span>
        }
      />
    </div>
  );
}
