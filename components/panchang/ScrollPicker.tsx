'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  label?: string;
}

const ITEM_H = 40;
const VISIBLE = 5;
const COL_H = ITEM_H * VISIBLE;

export function ScrollColumn({ items, selectedIndex, onChange, width = 80, label }: ScrollColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const dragRef = useRef<{ startY: number; startIdx: number } | null>(null);

  function clamp(idx: number) {
    return ((idx % items.length) + items.length) % items.length;
  }

  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 1 : -1;
      setAnimating(true);
      onChange(clamp(selectedIndexRef.current + delta));
      setTimeout(() => setAnimating(false), 180);
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (!dragRef.current) return;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      setOffset(dy);
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onChange]);

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startIdx: selectedIndex };
    setOffset(0);
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(dy);
  }
  function onMouseUp() {
    if (!dragRef.current) return;
    const dy = offsetRef.current;
    const steps = -Math.round(dy / ITEM_H);
    if (steps !== 0) onChange(clamp(dragRef.current.startIdx + steps));
    dragRef.current = null;
    setOffset(0);
  }

  function onTouchStart(e: React.TouchEvent) {
    dragRef.current = { startY: e.touches[0].clientY, startIdx: selectedIndex };
    setOffset(0);
  }
  function onTouchEnd() {
    if (!dragRef.current) return;
    const dy = offsetRef.current;
    const steps = -Math.round(dy / ITEM_H);
    if (steps !== 0) onChange(clamp(dragRef.current.startIdx + steps));
    dragRef.current = null;
    setOffset(0);
  }

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  });

  const baseTranslate = -selectedIndex * ITEM_H + (VISIBLE - 1) / 2 * ITEM_H + offset;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      {label && (
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--moonsilver-dim)', marginBottom: '2px' }}>
          {label}
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width, height: COL_H, cursor: 'ns-resize', position: 'relative', overflow: 'hidden', userSelect: 'none' }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 2, background: 'linear-gradient(to bottom, var(--night-elevated) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2, background: 'linear-gradient(to top, var(--night-elevated) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, borderTop: '1px solid var(--gold-dim)', borderBottom: '1px solid var(--gold-dim)', background: 'rgba(200,150,26,0.06)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          transition: animating ? 'transform 0.18s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
          transform: `translateY(${baseTranslate}px)`,
        }}>
          {items.map((item, idx) => {
            const d = idx - selectedIndex;
            const absDist = Math.min(Math.abs(d), 2);
            const opacity = absDist === 0 ? 1 : absDist === 1 ? 0.55 : 0.28;
            const scale = absDist === 0 ? 1 : absDist === 1 ? 0.9 : 0.8;
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={idx}
                onClick={() => { if (!isSelected) { setAnimating(true); onChange(idx); setTimeout(()=>setAnimating(false), 180); } }}
                style={{
                  height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Cinzel, serif',
                  fontSize: isSelected ? '0.95rem' : '0.82rem',
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? 'var(--gold-light)' : 'var(--moonsilver)',
                  opacity,
                  transform: `scale(${scale})`,
                  transition: 'opacity 0.15s, transform 0.15s',
                  cursor: isSelected ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingInline: 4,
                  letterSpacing: isSelected ? '0.04em' : 0,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
