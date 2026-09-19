'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A single score number that opens its own small popup naming it.
 * Self-contained: it does NOT use InfoDot's global CLOSE_ALL, and it
 * stops mousedown propagation so the parent popup it lives inside stays open.
 */
function ScorePopup({ value, label, hint }: { value: number; label: string; hint: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() { setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  function toggle(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const W = 190;
    let left = r.left;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (left < 8) left = 8;
    let top = r.bottom + 6;
    if (top + 90 > window.innerHeight - 8) top = r.top - 90;
    if (top < 8) top = 8;
    setPos({ top, left });
    setOpen(v => !v);
  }

  return (
    <>
      <span
        ref={triggerRef}
        onClick={toggle}
        onTouchEnd={toggle}
        onMouseDown={e => e.stopPropagation()}
        role="button"
        tabIndex={0}
        aria-label={label}
        style={{
          fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '1rem',
          color: 'var(--gold-light)', cursor: 'pointer', lineHeight: 1.2,
          borderBottom: '1px dotted var(--gold-dim)',
        }}
      >{value}</span>
      {mounted && open && createPortal(
        <div
          ref={popRef}
          className="info-popup"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 100000, width: 'auto', maxWidth: 200, minWidth: 120 }}
        >
          <div className="popup-title" style={{ marginBottom: '0.25rem' }}>{label}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--moonsilver)', lineHeight: 1.45 }}>{hint}</div>
        </div>,
        document.body,
      )}
    </>
  );
}

// Sub-popups dispatch this so opening one closes any other open sibling, while
// leaving the parent (main) popup open. The main InfoDot does NOT listen to it.
const SUB_CLOSE = 'tithipopup:closeSubs';

/**
 * A generic mini sub-popup that lives inside a larger popup. Clicking the trigger
 * toggles a small portal popup with an optional title and body. It stops mousedown
 * propagation so the parent popup stays open, and is mutually exclusive with other
 * MiniPopups (opening one closes the rest).
 */
export function MiniPopup({ trigger, title, body, width = 200 }: {
  trigger: React.ReactNode;
  title?: string;
  body: React.ReactNode;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const myId = useRef(Math.random());

  useEffect(() => { setMounted(true); }, []);

  // Close when another sibling sub-popup opens.
  useEffect(() => {
    function onCloseSubs(e: Event) {
      const ce = e as CustomEvent;
      if (ce.detail?.except !== myId.current) setOpen(false);
    }
    document.addEventListener(SUB_CLOSE, onCloseSubs);
    return () => document.removeEventListener(SUB_CLOSE, onCloseSubs);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() { setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  function toggle(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!triggerRef.current) return;
    document.dispatchEvent(new CustomEvent(SUB_CLOSE, { detail: { except: myId.current } }));
    const r = triggerRef.current.getBoundingClientRect();
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    let top = r.bottom + 6;
    if (top + 90 > window.innerHeight - 8) top = r.top - 90;
    if (top < 8) top = 8;
    setPos({ top, left });
    setOpen(v => !v);
  }

  return (
    <>
      <span
        ref={triggerRef}
        onClick={toggle}
        onTouchEnd={toggle}
        onMouseDown={e => e.stopPropagation()}
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
      >{trigger}</span>
      {mounted && open && createPortal(
        <div
          ref={popRef}
          className="info-popup"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 100000, width: 'auto', maxWidth: width + 12, minWidth: 120 }}
        >
          {title && <div className="popup-title" style={{ marginBottom: '0.25rem' }}>{title}</div>}
          <div style={{ fontSize: '0.92rem', color: 'var(--moonsilver)', lineHeight: 1.45 }}>{body}</div>
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * Shared popup body used by both the Basic Info element dots (with scores)
 * and the Auspicious/Inauspicious muhurta dots (without scores).
 * Layout: category box (colored) → optional scores → description.
 * The element/muhurta NAME is rendered by InfoDot's `title` above this body.
 */
export default function PopupContent({ auspiciousness, isAuspicious, reason, scores }: {
  auspiciousness: string;
  isAuspicious: boolean;
  reason: string;
  scores?: { general: number; business: number };
}) {
  return (
    <div>
      <span
        className={`popup-badge ${isAuspicious ? 'auspicious' : 'inauspicious'}`}
        style={{ display: 'block', marginBottom: scores ? '0.5rem' : '0.45rem', textAlign: 'center' }}
      >
        {auspiciousness}
      </span>
      {scores && (
        <div style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', marginBottom: '0.55rem' }}>
          <ScorePopup value={scores.general} label="General Score" hint="Overall auspiciousness, out of 100." />
          <ScorePopup value={scores.business} label="Business Score" hint="For business / finance / contracts, out of 100." />
        </div>
      )}
      <div style={{ fontSize: '0.82rem', color: 'var(--moonsilver)', lineHeight: 1.5 }}>{reason}</div>
    </div>
  );
}
