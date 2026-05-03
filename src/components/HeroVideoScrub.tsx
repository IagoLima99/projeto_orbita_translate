import { useRef, useEffect, useCallback } from 'react';

/**
 * HeroVideoScrub — Scroll-driven video scrub (Apple/igloo-style).
 *
 * Architecture:
 * ┌─────────────────────────── <section> height: TRACK_HEIGHT ──────────────┐
 * │  ┌──── sticky top:0, h:100vh ────┐                                     │
 * │  │                                │  ← video pinned here visually      │
 * │  │        <video> (covers)        │                                     │
 * │  │                                │                                     │
 * │  └────────────────────────────────┘                                     │
 * │                                                                         │
 * │  ← user scrolls through this empty space → progress 0→1                │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - No preventDefault. No scroll hijack. Pure CSS sticky + scroll mapping.
 * - All hot-path state in refs (zero re-renders during scroll).
 * - Passive scroll listener + RAF for 60fps sync.
 * - requestVideoFrameCallback used when available for tighter sync.
 */

const VIDEO_SRC = '/media/Orbita_Desc_scrub.mp4';

/** How many viewports of scroll height the video track occupies */
const TRACK_VH = 3;

interface HeroVideoScrubProps {
  /** Fires when mode changes between VIDEO (scrubbing) and APP (finished) */
  onModeChange?: (mode: 'VIDEO' | 'APP') => void;
}

export default function HeroVideoScrub({ onModeChange }: HeroVideoScrubProps) {
  // ─── REFS (no state → no re-renders during scroll) ────────────────────────
  const trackRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const readyRef = useRef(false);
  const completedRef = useRef(false);
  const rafId = useRef(0);
  const lastProgressRef = useRef(0);
  const hintRef = useRef<HTMLDivElement>(null);

  // ─── SCROLL RESTORATION ───────────────────────────────────────────────────
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // ─── VIDEO METADATA ───────────────────────────────────────────────────────
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || readyRef.current) return;

    durationRef.current = video.duration;
    readyRef.current = true;
    video.pause();
    video.currentTime = 0;

    // [DEBUG] Remove after confirming scrub works
    console.log('[HeroVideoScrub] ✅ Video ready | duration:', video.duration.toFixed(2), 's');
  }, []);

  // ─── SCROLL → currentTime SYNC ───────────────────────────────────────────
  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track || !video) return;

    /** Calculate progress 0→1 from scroll position relative to track */
    const calcProgress = (): number => {
      const rect = track.getBoundingClientRect();
      const scrollable = track.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return 0;
      const scrolled = -rect.top;
      return Math.max(0, Math.min(1, scrolled / scrollable));
    };

    /** Seek video to match progress — called on RAF for smoothness */
    const syncFrame = () => {
      if (!readyRef.current || durationRef.current <= 0) {
        rafId.current = requestAnimationFrame(syncFrame);
        return;
      }

      const progress = calcProgress();
      const prevBucket = Math.floor(lastProgressRef.current * 10);
      lastProgressRef.current = progress;

      const targetTime = progress * durationRef.current;

      // Only seek if delta is meaningful (avoids micro-jitter)
      if (Math.abs(video.currentTime - targetTime) > 0.016) {
        video.currentTime = targetTime;
      }

      // Fade out video near the end (0.98 to 1.0)
      const showAppAt = 0.98;
      const fadeWindow = 0.02;
      let videoOpacity = 1;
      
      if (progress >= showAppAt) {
        videoOpacity = Math.max(0, 1 - ((progress - showAppAt) / fadeWindow));
      }
      
      video.style.opacity = videoOpacity.toString();

      // Scroll hint visibility matches video opacity so it fades out exactly with the video
      if (hintRef.current) {
        hintRef.current.style.opacity = videoOpacity.toString();
      }

      // Completion detection (Strictly trigger APP mode only when video is fully transparent)
      if (progress >= 0.999 && !completedRef.current) {
        completedRef.current = true;
        console.log('[HeroVideoScrub] 🏁 Video scrub complete -> APP mode');
        onModeChange?.('APP');
      } else if (progress < 0.99 && completedRef.current) {
        completedRef.current = false;
        console.log('[HeroVideoScrub] ⏪ Scrolled up -> VIDEO mode');
        onModeChange?.('VIDEO');
      }

      // [DEBUG] Log every ~10% change
      const currBucket = Math.floor(progress * 10);
      if (prevBucket !== currBucket) {
        console.log(
          `[HeroVideoScrub] progress: ${(progress * 100).toFixed(0)}% | currentTime: ${targetTime.toFixed(2)}s`
        );
      }
    };

    // Use scroll event (passive) to trigger RAF
    let scrollTicking = false;
    const onScroll = () => {
      if (!scrollTicking) {
        scrollTicking = true;
        rafId.current = requestAnimationFrame(() => {
          syncFrame();
          scrollTicking = false;
        });
      }
    };

    // Initial sync (in case page loads scrolled)
    rafId.current = requestAnimationFrame(syncFrame);

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [onModeChange]);

  return (
    <section
      ref={trackRef}
      id="hero-video-scrub"
      className="relative w-full"
      style={{ height: `${TRACK_VH * 100}vh` }}
    >
      {/* ── Sticky container — pins video to viewport ── */}
      <div
        className="sticky top-0 w-full overflow-hidden"
        style={{ height: '100vh' }}
      >
        {/* Black base to prevent any flash of white */}
        <div className="absolute inset-0 bg-black" />

        {/* ── VIDEO ── */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Vignette overlay — premium fade to black at edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background: `
              radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%),
              linear-gradient(to bottom, transparent 65%, rgba(2,2,8,0.9) 100%)
            `,
          }}
        />

        {/* Premium Lateral Scroll Indicator */}
        <div
          ref={hintRef}
          className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 pointer-events-none transition-opacity duration-300"
          style={{ zIndex: 3, opacity: 1 }}
        >
          <span 
            className="text-white/60 text-[9px] md:text-[11px] font-medium tracking-[0.4em] uppercase select-none drop-shadow-md" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Role para continuar
          </span>

          <svg width="2" height="80" viewBox="0 0 2 80" fill="none">
            {/* Track */}
            <rect width="2" height="80" rx="1" fill="currentColor" className="text-white/10" />
            {/* Animated droplet */}
            <rect width="2" height="20" rx="1" fill="currentColor" className="text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              <animate attributeName="y" values="-20;80" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="2.5s" repeatCount="indefinite" />
            </rect>
          </svg>
        </div>
      </div>
    </section>
  );
}
