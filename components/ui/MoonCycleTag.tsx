'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CLOSE_ALL = 'infodot:closeAll';

export default function MoonCycleTag({ roseOnDate }: { roseOnDate: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const tagRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    if (!open) return;
    function close() { setOpen(false); }
    function outside(e: MouseEvent) {
      const t = e.target as Node;
      if (popupRef.current?.contains(t) || tagRef.current?.contains(t)) return;
      setOpen(false);
    }
    function touchOutside(e: TouchEvent) {
      const t = e.target as Node;
      if (popupRef.current?.contains(t) || tagRef.current?.contains(t)) return;
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
    if (!open || !popupRef.current || !tagRef.current) return;
    const r = popupRef.current.getBoundingClientRect();
    const dot = tagRef.current.getBoundingClientRect();
    let { left, top } = pos;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (left < 8) left = 8;
    if (top + r.height > window.innerHeight - 8) top = dot.top - r.height - 6;
    if (top < 8) top = 8;
    if (left !== pos.left || top !== pos.top) setPos({ top, left });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function show(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!tagRef.current) return;
    document.dispatchEvent(new CustomEvent(CLOSE_ALL, { detail: { except: myId.current } }));
    const rect = tagRef.current.getBoundingClientRect();
    const W = 220, H = 60;
    let left = rect.left;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + H > window.innerHeight - 8) top = rect.top - H - 6;
    if (top < 8) top = 8;
    setPos({ top, left });
    setOpen(v => !v);
  }

  return (
    <>
      <sup
        ref={tagRef}
        onClick={show}
        onTouchEnd={e => show(e)}
        role="button"
        tabIndex={0}
        aria-label={`Moon rose on ${roseOnDate}`}
        onKeyDown={e => e.key === 'Enter' && show(e as any)}
        style={{
          color: 'var(--moonsilver-dim)',
          fontSize: '0.82em',
          fontWeight: 700,
          cursor: 'pointer',
          userSelect: 'none',
          marginRight: '2px',
          lineHeight: 1,
        }}
      >☽</sup>
      {mounted && open && createPortal(
        <div
          ref={popupRef}
          className="info-popup"
          style={{ top: pos.top, left: pos.left, position: 'fixed', zIndex: 99999, width: 'auto', maxWidth: 240, minWidth: 150 }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--moonsilver)', lineHeight: 1.5 }}>
            Moon rose on: <strong style={{ color: 'var(--gold-light)' }}>{roseOnDate}</strong>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
