'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CLOSE_ALL = 'infodot:closeAll';

interface InfoDotProps {
  title: string;
  brief: string;
  briefNode?: React.ReactNode;
  isAuspicious?: boolean | null;
  descriptionOnly?: boolean;
  large?: boolean;
  label?: string;
  popupMaxWidth?: number;
}

export default function InfoDot({ title, brief, briefNode, isAuspicious, descriptionOnly, large, label, popupMaxWidth = 268 }: InfoDotProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const dotRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const myId = useRef(Math.random());

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleCloseAll(e: Event) {
      const ce = e as CustomEvent;
      if (ce.detail?.except !== myId.current) setOpen(false);
    }
    document.addEventListener(CLOSE_ALL, handleCloseAll);
    return () => document.removeEventListener(CLOSE_ALL, handleCloseAll);
  }, []);

  function show(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!dotRef.current) return;
    document.dispatchEvent(new CustomEvent(CLOSE_ALL, { detail: { except: myId.current } }));
    const rect = dotRef.current.getBoundingClientRect();
    const W = popupMaxWidth, H = 180;
    let left = rect.left;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + H > window.innerHeight - 8) top = rect.top - H - 6;
    if (top < 8) top = 8;
    setPos({ top, left });
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function close() { setOpen(false); }
    function outside(e: MouseEvent) {
      const t = e.target as Node;
      if (popupRef.current?.contains(t) || dotRef.current?.contains(t)) return;
      setOpen(false);
    }
    function touchOutside(e: TouchEvent) {
      const t = e.target as Node;
      if (popupRef.current?.contains(t) || dotRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    window.addEventListener('scroll', close, true);
    document.addEventListener('touchstart', touchOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('touchstart', touchOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !popupRef.current || !dotRef.current) return;
    const r = popupRef.current.getBoundingClientRect();
    const dot = dotRef.current.getBoundingClientRect();
    let { left, top } = pos;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (left < 8) left = 8;
    if (top + r.height > window.innerHeight - 8) top = dot.top - r.height - 6;
    if (top < 8) top = 8;
    if (left !== pos.left || top !== pos.top) setPos({ top, left });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const popup = (
    <div
      ref={popupRef}
      className="info-popup"
      style={{ top: pos.top, left: pos.left, position: 'fixed', zIndex: 99999, width: 'auto', maxWidth: popupMaxWidth, minWidth: 160 }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {!descriptionOnly && <div className="popup-title" style={{ marginBottom: isAuspicious != null ? '0.35rem' : '0.4rem' }}>{title}</div>}
      {!descriptionOnly && isAuspicious != null && (
        <span className={`popup-badge ${isAuspicious ? 'auspicious' : 'inauspicious'}`} style={{ marginTop: 0, marginBottom: '0.4rem', display: 'block' }}>
          {isAuspicious ? '✦ Auspicious' : '✗ Inauspicious'}
        </span>
      )}
      <div style={{ fontSize: '0.82rem', color: 'var(--moonsilver)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
        {briefNode ?? brief}
      </div>
    </div>
  );

  return (
    <>
      <span
        ref={dotRef}
        className={label ? undefined : 'info-dot'}
        onClick={show}
        onTouchEnd={e => show(e)}
        role="button"
        tabIndex={0}
        aria-label="More info"
        onKeyDown={e => e.key === 'Enter' && show(e as any)}
        style={label ? {
          color: 'var(--dot-color)',
          fontFamily: 'Cinzel, serif',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          lineHeight: 1,
          userSelect: 'none',
        } : large ? { width: '8px', height: '8px' } : undefined}
      >{label}</span>
      {mounted && open && createPortal(popup, document.body)}
    </>
  );
}
