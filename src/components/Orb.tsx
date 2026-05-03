import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { OrbState } from '../types';

interface OrbProps {
  state: OrbState;
  onClick: () => void;
}

import { memo } from 'react';

export default memo(function Orb({ state, onClick }: OrbProps) {
  // Mouse tracking for micro-tilt only (ORB is a fixed anchor, not part of camera group)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth)  * 2 - 1);
      mouseY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseX, mouseY]);

  // Micro 3D Tilt on ORB body — max ±0.5°, heavy damping so it barely moves
  const springConfig = { damping: 60, stiffness: 50, mass: 1.2 };
  const rotateX = useTransform(mouseY, [-1, 1], [0.5, -0.5]);
  const rotateY = useTransform(mouseX, [-1, 1], [-0.5, 0.5]);
  const smoothRotateX = useSpring(rotateX, springConfig);
  const smoothRotateY = useSpring(rotateY, springConfig);

  return (
    <motion.div 
      className="relative flex items-center justify-center cursor-pointer group outline-none" 
      style={{ perspective: 1000 }}
      onClick={onClick}
      onMouseEnter={() => {
        // Dispatch spatial impulse: push background opposite to mouse direction
        // so it feels like "the universe reacts to being touched"
        const mx = mouseX.get(); // -1 to 1
        const my = mouseY.get();
        window.dispatchEvent(new CustomEvent('orbita:spatial-impulse', {
          detail: {
            dx: mx * -22, // Push background opposite to where mouse came from
            dy: my * -22,
          }
        }));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Orbita. Toque para falar."
      aria-pressed={state !== 'idle'}
    >
      {/* Bloom / Atmosphere — fixed position, no parallax (camera group handles depth) */}
      <motion.div
        className="absolute w-64 md:w-80 h-64 md:h-80 rounded-full orb-bloom pointer-events-none"
        style={{ willChange: 'transform, opacity' }}
        animate={{
          scale: state === 'listening' ? [1, 1.15, 1] : state === 'processing' ? [1, 1.05, 1] : [1, 1.02, 1],
          opacity: state === 'processing' ? 0.6 : state === 'listening' ? 0.4 : 0.2,
        }}
        transition={{
          duration: state === 'idle' ? 6 : state === 'listening' ? 2 : 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Main Orb Body with Physical Depth and 3D Tilt */}
      <motion.div
        className="relative w-32 md:w-44 h-32 md:h-44 rounded-full flex items-center justify-center overflow-hidden transition-shadow duration-700"
        style={{
          background: 'radial-gradient(circle at 35% 35%, var(--color-accent-purple) 0%, var(--color-accent-blue) 100%)',
          boxShadow: `
            inset -15px -15px 30px rgba(0,0,0,0.6), 
            inset 10px 10px 20px rgba(255,255,255,0.2),
            0 0 30px rgba(139, 92, 246, ${state === 'processing' ? '0.6' : '0.3'})
          `,
          willChange: 'transform',
          rotateX: smoothRotateX,
          rotateY: smoothRotateY,
          transformStyle: "preserve-3d"
        }}
        animate={{
          scale: state === 'listening' ? 1.08 : state === 'result' ? 0.95 : 1,
          y: state === 'idle' ? [0, -4, 0] : 0
        }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 0.6, ease: "easeOut" }
        }}
      >
        {/* Specular Highlight (Reflection) */}
        <div className="absolute top-[10%] left-[20%] w-[40%] h-[30%] bg-white/10 blur-[12px] rounded-full rotate-[-20deg]" />
        
        {/* Internal Core Activity */}
        <motion.div
          className="w-full h-full rounded-full mix-blend-overlay"
          style={{ 
            background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.4), transparent)',
            willChange: 'transform, opacity',
          }}
          initial={false}
          animate={{
            rotate: state === 'processing' ? 360 : [0, 90, 180, 270, 360],
            opacity: state === 'processing' ? 0.5 : 0.15 // Default fraco
          }}
          whileHover={{
            opacity: state === 'processing' ? 0.6 : 0.45 // Mais aparente no hover
          }}
          transition={{
            rotate: {
              duration: state === 'processing' ? 0.8 : 12,
              repeat: Infinity,
              ease: "linear"
            },
            opacity: { duration: 0.5 }
          }}
        />

        {/* Processing Shimmer Overlay */}
        <AnimatePresence>
          {state === 'processing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ willChange: 'opacity' }}
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent mix-blend-overlay"
            />
          )}
        </AnimatePresence>

        {/* Listening Halo (Inner) */}
        <AnimatePresence>
          {state === 'listening' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ willChange: 'transform, opacity' }}
              className="absolute w-20 h-20 border-[3px] border-white/60 rounded-full"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* State Text Interaction */}
      <div className="absolute -bottom-20 md:-bottom-28 w-full text-center pointer-events-none select-none" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-white/80 font-medium tracking-[0.35em] text-[11px] uppercase"
            style={{
              textShadow: '0 0 20px rgba(139,92,246,0.8), 0 2px 8px rgba(0,0,0,0.9)',
            }}
          >
            {state === 'idle' && 'Toque para falar'}
            {state === 'listening' && 'Ouvindo...'}
            {state === 'processing' && 'Processando...'}
            {state === 'result' && 'Resultado'}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
