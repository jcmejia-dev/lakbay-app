'use client';

import { useEffect, useState } from 'react';
import {playLakbayReveal} from '@/lib/launch-sound';

export default function Splash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'checking' | 'brand' | 'closing' | 'ready'>('checking');
  const active = phase !== 'ready';
  useEffect(() => {
    // Replay the brand reveal on every cold launch, not tab visibility changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('brand');
    let played = false;
    const play = () => { if (!played) played = playLakbayReveal(); };
    play();
    window.addEventListener('pointerdown', play, {once:true});
    window.addEventListener('keydown', play, {once:true});
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 1900;
    const reveal = window.setTimeout(() => {
      setPhase('closing');
    }, duration);
    const finish = window.setTimeout(() => setPhase('ready'), duration + 180);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(finish);
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('keydown', play);
    };
  }, []);

  return (
    <>
      <div inert={active ? true : undefined} aria-hidden={active ? true : undefined} style={phase === 'checking' ? {visibility: 'hidden'} : undefined}>
        {children}
      </div>
      {(phase === 'brand' || phase === 'closing') && (
        <div className="lakbay-splash" data-motion={phase === 'closing' ? 'closed' : 'open'} role="status" aria-label="Opening Lakbay">
          <div className="splash-lockup" aria-hidden="true">
            <img className="splash-logo" src="/images/lakbay-arrow.webp" alt="" width={76} height={64} fetchPriority="high" />
            <div className="splash-word-mask">
              <span className="splash-word">lakbay<span>.</span></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
