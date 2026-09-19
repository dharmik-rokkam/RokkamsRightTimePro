'use client';
import { useState } from 'react';

interface ExpandSectionProps {
  title: string;
  icon?: React.ReactNode;
  titleExtra?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentColor?: string;
}

export default function ExpandSection({ title, icon, titleExtra, defaultOpen = false, children, accentColor }: ExpandSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="section-card">
      <div className="section-header" onClick={() => setOpen(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {icon && <span style={{ color: accentColor ?? 'var(--gold)', fontSize: '0.9rem' }}>{icon}</span>}
          <span className="section-title" style={accentColor ? { color: accentColor } : undefined}>{title}</span>
          {titleExtra}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ color: 'var(--gold-dim)', transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && (
        <div className="section-body animate-in">
          {children}
        </div>
      )}
    </div>
  );
}
