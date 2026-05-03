import { motion, useAnimationFrame, useMotionValue, useTransform, useSpring } from 'motion/react';
import React, { useMemo, useEffect, useRef, CSSProperties, Key } from 'react';
import { OrbState } from '../types';
import { useScrollProgress } from '../hooks/useScrollProgress';

interface CosmicBackgroundProps {
  state: OrbState;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDuration: number;
  colorClass: number;
}

const NOISE_URI = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E`;
// Larger SVG + higher baseFrequency → finer cells → no visible tile grid
const CLOUDS_URI = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='1200' height='1200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E`;

/** Spectral star colors mapped from real stellar classification */
const STAR_COLORS = [
  'rgba(255,255,255,',      // Type A/F — white
  'rgba(252,211,77,',       // Type G/K — golden (Sol-like)
  'rgba(254,202,202,',      // Type M   — red dwarf
  'rgba(186,230,253,',      // Type O/B — blue giant
];

const springConfig = { damping: 25, stiffness: 50 };

export default React.memo(function CosmicBackground({ state }: CosmicBackgroundProps) {
  // ── Camera state (lerp target vs current)
  const targetX = useRef(0);
  const targetY = useRef(0);
  const camX = useSpring(0, springConfig);
  const camY = useSpring(0, springConfig);

  const reducedMotion = useRef(false);

  // ── Spatial impulse (hover only) ────────────────────────────────
  const impulseX = useMotionValue(0);
  const impulseY = useMotionValue(0);
  const MAX_IMPULSE = 30;

  // MOUSE FOLLOW PARALLAX
  useEffect(() => {
    // Only run if the app is active
    if (!state) return;

    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) return;

    let rafId: number;
    const range = 60; // Max pixels to move

    const onMove = (e: MouseEvent) => {
      targetX.current = (e.clientX / window.innerWidth  - 0.5) * 2 * range;
      targetY.current = (e.clientY / window.innerHeight - 0.5) * 2 * range;
    };

    // Orb hover → spatial impulse (dispatched from Orb.tsx via CustomEvent)
    const onImpulse = (e: Event) => {
      if (reducedMotion.current) return;
      const { dx, dy } = (e as CustomEvent<{ dx: number; dy: number }>).detail;
      impulseX.set(Math.max(-MAX_IMPULSE, Math.min(MAX_IMPULSE, impulseX.get() + dx)));
      impulseY.set(Math.max(-MAX_IMPULSE, Math.min(MAX_IMPULSE, impulseY.get() + dy)));
    };

    // NOTE: wheel listener removed — scroll is now handled via useScrollProgress
    // to avoid locking the native browser scroll.
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('orbita:spatial-impulse', onImpulse);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('orbita:spatial-impulse', onImpulse);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Combine: camera lerp + hover impulse
  const finalX = useTransform(
    [camX, impulseX],
    (vals: number[]) => vals[0] + vals[1]
  );
  const finalY = useTransform(
    [camY, impulseY],
    (vals: number[]) => vals[0] + vals[1]
  );

  // Animation frame: camera lerp + impulse decay
  useAnimationFrame(() => {
    if (reducedMotion.current) return;

    const ease = 0.04;
    camX.set(camX.get() + (targetX.current - camX.get()) * ease);
    camY.set(camY.get() + (targetY.current - camY.get()) * ease);

    // Impulse decay — gone in ~700ms at 0.91 factor per frame
    const ix = impulseX.get();
    const iy = impulseY.get();
    if (Math.abs(ix) > 0.05) impulseX.set(ix * 0.91); else impulseX.set(0);
    if (Math.abs(iy) > 0.05) impulseY.set(iy * 0.91); else impulseY.set(0);
  });

  // Deterministic star field
  const stars = useMemo<Star[]>(() =>
    Array.from({ length: 65 }, (_, i) => {
      const ra = Math.sin(i * 127.1) * 43758.5453;
      const rb = Math.sin(i * 311.7) * 43758.5453;
      const rc = Math.sin(i * 74.3 + 1) * 43758.5453;
      const r1 = ra - Math.floor(ra);
      const r2 = rb - Math.floor(rb);
      const r3 = rc - Math.floor(rc);
      return {
        id: i,
        x: r1 * 100,
        y: r2 * 100,
        size: 0.7 + r3 * 1.6,
        opacity: 0.12 + r3 * 0.32,
        twinkleDuration: 3 + (i % 6),
        colorClass: i % 4,
      };
    }), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className="fixed inset-0 z-10 overflow-hidden pointer-events-none bg-[#020208]"
      style={{ perspective: '1000px', perspectiveOrigin: '50% 50%' }}
    >
      {/* ── Static base gradient (no camera influence, never reveals gaps) ── */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #150914 0%, #050312 55%, #020208 100%)' }}
      />
      {/* ════════════════════════════════════════════
          CAMERA GROUP
          Oversized 130% × 130% to absorb max ±100px translation.
          translate3d controlled by mouse lerp via camX/camY.
          preserve-3d so children Z depths are respected.
         ════════════════════════════════════════════ */}
      <motion.div
        style={{
          position: 'absolute',
          top: '-15%', left: '-15%', width: '130%', height: '130%',
          transformStyle: 'preserve-3d',
          x: finalX,
          y: finalY,
          willChange: 'transform',
        }}
      >

        {/* ── DEPTH LAYER 1: Stars — translateZ(-300px) — FURTHEST ── */}
        {/* Perspective 1000px at Z-300 → apparent movement = camera × 0.77 */}
        <div className="absolute inset-0" style={{ transform: 'translateZ(-300px)' }}>
          {stars.map(star => <StarDot key={star.id} star={star} state={state} />)}
        </div>

        {/* ── DEPTH LAYER 2: Nebulas & Cosmic Dust — translateZ(-150px) — MID ── */}
        {/* Perspective 1000px at Z-150 → apparent movement = camera × 0.87 */}
        <div className="absolute inset-0" style={{ transform: 'translateZ(-150px)' }}>
          {/* Hydrogen-Alpha (Deep Red) */}
          <NebulaBlob
            state={state} color="185,28,28" opacityIdle={0.18}
            style={{ top: '-20%', left: '-15%', width: '90vw', height: '90vw' }}
            duration={45} rotateRange={5} direction={1} delay={0}
          />
          {/* Oxygen-III (Cyan) */}
          <NebulaBlob
            state={state} color="2,132,199" opacityIdle={0.14}
            style={{ bottom: '-35%', right: '-20%', width: '100vw', height: '100vw' }}
            duration={55} rotateRange={3} direction={-1} delay={5}
          />
          {/* Warm Stellar Dust (Amber) */}
          <NebulaBlob
            state={state} color="245,158,11" opacityIdle={0.09}
            style={{ top: '15%', right: '0%', width: '70vw', height: '70vw' }}
            duration={50} rotateRange={4} direction={1} delay={10}
          />
          {/* Base Structure (Deep Purple) */}
          <NebulaBlob
            state={state} color="109,40,217" opacityIdle={0.12}
            style={{ bottom: '5%', left: '-25%', width: '85vw', height: '85vw' }}
            duration={60} rotateRange={6} direction={-1} delay={15}
          />
          {/* Cosmic gas texture — no-repeat/cover eliminates tile seam artifacts */}
          <motion.div
            className="absolute mix-blend-overlay pointer-events-none"
            style={{
              inset: '-10%',          // slightly oversized so cover never exposes edges
              backgroundImage: `url("${CLOUDS_URI}")`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.18,
              willChange: 'transform',
            }}
            animate={{
              scale: state === 'listening' ? 0.99 : state === 'processing' ? [1, 1.02, 1] : 1,
            }}
            transition={{
              scale: { duration: state === 'processing' ? 3 : 2, repeat: state === 'processing' ? Infinity : 0, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* ── DEPTH LAYER 3: Ambient aura — translateZ(-50px) — NEAREST ── */}
        {/* Perspective 1000px at Z-50 → apparent movement = camera × 0.95 */}
        <div className="absolute inset-0" style={{ transform: 'translateZ(-50px)' }}>
          {/* State-reactive center glow */}
          <motion.div
            className="absolute rounded-full mix-blend-screen pointer-events-none"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '55vw', height: '55vw',
              background: 'radial-gradient(circle, rgba(245,158,11,0.14) 0%, rgba(139,92,246,0.09) 40%, transparent 70%)',
              willChange: 'opacity',
            }}
            animate={{
              scale: state === 'listening' ? 1.12 : state === 'processing' ? [1, 1.06, 1] : 1,
              opacity: state === 'result' ? 0.12 : state === 'processing' ? 0.40 : 0.28,
            }}
            transition={{
              duration: state === 'processing' ? 2 : 3,
              repeat: state === 'processing' ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />
        </div>

      </motion.div>
      {/* ════ END CAMERA GROUP ════ */}

      {/* ── STATIC OVERLAYS (outside camera, always fixed) ── */}

      {/* Fine grain noise — large tile (512px) hides seams at 0.03 opacity */}
      <div
        className="absolute inset-0 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url("${NOISE_URI}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          opacity: 0.03,
        }}
      />

      {/* Vignette — keeps ORB as focal anchor */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(2,2,8,0.65) 75%, rgba(2,2,8,0.97) 100%)',
        }}
      />
    </motion.div>
  );
});

// ─── Sub-components ───────────────────────────────────────────────────────────

interface NebulaBlobProps {
  state: OrbState;
  color: string;
  opacityIdle: number;
  style: CSSProperties;
  duration: number;
  rotateRange: number;
  direction: 1 | -1;
  delay: number;
}

const NebulaBlob = React.memo(function NebulaBlob({
  state,
  color, opacityIdle, style, duration, rotateRange, direction, delay }: NebulaBlobProps) {
  const opacity =
    state === 'listening'   ? opacityIdle * 1.25 :
    state === 'processing'  ? opacityIdle * 1.45 :
    state === 'result'      ? opacityIdle * 0.85 :
    opacityIdle;

  const scale = state === 'listening' ? 0.97 : state === 'result' ? 0.99 : 1;
  const speedMult = state === 'processing' ? 0.6 : state === 'listening' ? 0.8 : 1;

  return (
    <motion.div
      className="absolute rounded-full mix-blend-screen"
      style={{
        ...style,
        background: `radial-gradient(ellipse at center, rgba(${color},0.55) 0%, rgba(${color},0.18) 40%, transparent 70%)`,
        willChange: 'transform, opacity',
      }}
      animate={{ scale, opacity, rotate: [0, rotateRange * direction, 0] }}
      transition={{
        duration: duration * speedMult,
        repeat: Infinity,
        ease: 'easeInOut',
        repeatType: 'mirror',
        delay,
      }}
    />
  );
});

// ── Star (Static base rendering + motion for twinkling & drift) ──
const StarDot = React.memo(function StarDot({ star, state }: { star: Star; state: OrbState }) {
  const x = useMotionValue(star.x);
  const y = useMotionValue(star.y);

  useAnimationFrame((time) => {
    // Very slow autonomous drift (independent of camera)
    const speed =
      state === 'processing' ? 0.00012 :
      state === 'listening'  ? 0.00006 : 0.00002;

    const nx = x.get() + Math.sin(time / 22000 + star.id * 1.3) * speed;
    const ny = y.get() + Math.cos(time / 27000 + star.id * 1.7) * speed;
    x.set(nx < -5 ? 105 : nx > 105 ? -5 : nx);
    y.set(ny < -5 ? 105 : ny > 105 ? -5 : ny);
  });

  const color = STAR_COLORS[star.colorClass];

  return (
    <motion.div
      className="absolute rounded-full mix-blend-screen"
      style={{
        left: `${star.x}%`,
        top:  `${star.y}%`,
        width:  star.size,
        height: star.size,
        background: `${color}${star.opacity})`,
        boxShadow: `0 0 ${star.size * 2.5}px ${color}${star.opacity * 0.45})`,
        x,
        y,
        willChange: 'transform, opacity',
      }}
      animate={{ opacity: [star.opacity * 0.65, star.opacity, star.opacity * 0.75] }}
      transition={{
        duration: star.twinkleDuration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: (star.id * 0.21) % star.twinkleDuration,
      }}
    />
  );
});
