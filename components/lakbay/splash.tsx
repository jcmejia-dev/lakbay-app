'use client';

import { useEffect, useState } from 'react';
import WheelLoader from '@/components/lakbay/wheel-loader';
import {playLakbayReveal} from '@/lib/launch-sound';

type LaunchPhase = 'brand' | 'loading' | 'ready';

export default function Splash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<LaunchPhase>('brand');
  const [progress, setProgress] = useState(8);
  const active = phase !== 'ready';

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const brandDuration = reducedMotion ? 250 : 1900;
    const loadingDuration = reducedMotion ? 450 : 1400;
    let progressTimer: number | undefined;
    let finishTimer: number | undefined;

    const brandTimer = window.setTimeout(() => {
      setPhase('loading');
      const startedAt = Date.now();
      progressTimer = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setProgress(Math.min(100, Math.round(8 + (elapsed / loadingDuration) * 92)));
        if (elapsed >= loadingDuration) {
          window.clearInterval(progressTimer);
          finishTimer = window.setTimeout(() => setPhase('ready'), reducedMotion ? 80 : 180);
        }
      }, 50);
    }, brandDuration);

    return () => {
      window.clearTimeout(brandTimer);
      if (progressTimer !== undefined) window.clearInterval(progressTimer);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    let played = false;
    const play = () => { if (!played) played = playLakbayReveal(); };
    play();
    window.addEventListener('pointerdown', play, { once: true });
    window.addEventListener('keydown', play, { once: true });
    return () => { window.removeEventListener('pointerdown', play); window.removeEventListener('keydown', play); };
  }, []);

  return (
    <>
      <div inert={active ? true : undefined} aria-hidden={active ? true : undefined}>
        {children}
      </div>
      {phase === 'brand' && (
        <div className="lakbay-splash" role="status" aria-label="Opening Lakbay">
          <div className="splash-lockup" aria-hidden="true">
            <img className="splash-logo" src="/images/lakbay-arrow.webp" alt="" width={76} height={64} fetchPriority="high" />
            <div className="splash-word-mask">
              <span className="splash-word">lakbay<span>.</span></span>
            </div>
          </div>
        </div>
      )}
      {phase === 'loading' && (
        <div className="launch-loader">
          <WheelLoader value={progress} label="Getting your ride ready…" />
        </div>
      )}
    </>
  );
}
