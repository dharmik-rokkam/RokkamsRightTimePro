'use client';
import { useEffect, useState } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import BasicInfo from '@/components/panchang/BasicInfo';
import SpecialYogas from '@/components/panchang/SpecialYogas';
import AuspiciousTime from '@/components/panchang/AuspiciousTime';
import InauspiciousTime from '@/components/panchang/InauspiciousTime';
import NonOverlappingTime from '@/components/panchang/NonOverlappingTime';
import RankingTime from '@/components/panchang/RankingTime';
import CategoryResult from '@/components/panchang/CategoryResult';
import { CATEGORIES } from '@/lib/categoryScore';
import { getMuscatToday, digitRoot } from '@/lib/formatTime';

function StarDivider() {
  return (
    <div className="gold-divider" style={{ margin: '0.5rem 0' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--gold)" style={{ opacity: 0.5, flexShrink: 0 }}>
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
      </svg>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          height: 52, borderRadius: '2px',
          background: 'linear-gradient(90deg, var(--night-mid) 25%, var(--night-elevated) 50%, var(--night-mid) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          opacity: 0.6,
        }} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

export default function Home() {
  const [dateStr, setDateStr] = useState<string>(() => getMuscatToday());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setData(null);
    fetch('/api/panchang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('Could not compute Panchang. Please try again.'))
      .finally(() => setLoading(false));
  }, [dateStr]);

  const numRoot = digitRoot(dateStr);

  return (
    <>
      <SiteHeader dateStr={dateStr} onDateChange={setDateStr} numRoot={numRoot} />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '0.75rem clamp(0.5rem, 3vw, 0.85rem) 2rem', overflowX: 'hidden' }}>

        {loading && <div style={{ padding: '2rem 0' }}><Skeleton /></div>}

        {error && (
          <div style={{
            margin: '2rem 0', padding: '1.25rem', background: 'var(--inauspicious-bg)',
            border: '1px solid rgba(139,26,26,0.3)', borderRadius: '2px',
            color: '#E07070', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', letterSpacing: '0.06em',
            textAlign: 'center',
          }}>{error}</div>
        )}

        {data && !loading && (
          <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="animate-in">

            <BasicInfo data={data} pageDate={dateStr} />
            <SpecialYogas specialYogas={data.specialYogas} pageDate={dateStr} />
            <AuspiciousTime muhurta={data.muhurta} pageDate={dateStr} earlyMorningMuhurta={data.earlyMorningMuhurta} />
            <InauspiciousTime muhurta={data.muhurta} pageDate={dateStr} earlyMorningMuhurta={data.earlyMorningMuhurta} />
            <NonOverlappingTime muhurta={data.muhurta} pageDate={dateStr} earlyMorningMuhurta={data.earlyMorningMuhurta} />
            <RankingTime muhurta={data.muhurta} panchangData={data} pageDate={dateStr} />
            {CATEGORIES.map(cat => (
              <CategoryResult
                key={cat.key}
                category={cat}
                transitions={data.transitions}
                muhurta={data.muhurta}
                specialYogas={data.specialYogas}
                varaName={data.vara.name}
                paksha={data.paksha}
                pageDate={dateStr}
                earlyMorningMuhurta={data.earlyMorningMuhurta}
              />
            ))}

            <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem', borderTop: '1px solid var(--night-border)', marginTop: '0.5rem' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(0.62rem, 1.6vw, 0.72rem)', color: 'var(--moonsilver-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 2 }}>
                Muscat, Oman · UTC+4
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
