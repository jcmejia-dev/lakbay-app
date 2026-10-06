'use client';

import { useEffect, useState } from 'react';
import {playLakbayReveal} from '@/lib/launch-sound';

export default function Splash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'brand' | 'closing' | 'ready'>('brand');
  const [playing, setPlaying] = useState(false);
  const active = phase !== 'ready';
  useEffect(() => {
    let finished = false;
    let reveal: number | undefined;
    let finish: number | undefined;
    let played = false;
    const play = () => { if (!played) played = playLakbayReveal(); };
    const clear = () => { window.clearTimeout(reveal); window.clearTimeout(finish); };
    const start = () => {
      if (finished) return;
      clear();
      if (document.visibilityState === 'hidden') {
        setPlaying(false);
        setPhase('brand');
        return;
      }
      setPlaying(true);
      play();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reduced ? 250 : 1900;
      reveal = window.setTimeout(() => setPhase('closing'), duration);
      finish = window.setTimeout(() => {
        finished = true;
        setPhase('ready');
      }, duration + 180);
    };
    // The server-rendered title is visible before hydration. Only spend the
    // animation time while the app is visible, never behind Android's launch UI.
    start();
    document.addEventListener('visibilitychange', start);
    window.addEventListener('pointerdown', play, {once:true});
    window.addEventListener('keydown', play, {once:true});
    return () => {
      clear();
      document.removeEventListener('visibilitychange', start);
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('keydown', play);
    };
  }, []);

  return (
    <>
      <div inert={active ? true : undefined} aria-hidden={active ? true : undefined}>
        {children}
      </div>
      {active && (
        <div className="lakbay-splash" data-playing={playing} data-motion={phase === 'closing' ? 'closed' : 'open'} role="status" aria-label="Opening Lakbay">
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
