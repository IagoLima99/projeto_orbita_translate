import { useEffect, useRef } from 'react';
import { useMotionValue } from 'motion/react';

/**
 * Reads window.scrollY, normalizes to 0..1 against total scrollable height,
 * and lerps smoothly via RAF. Fully passive — never blocks scroll.
 */
export function useScrollProgress(): ReturnType<typeof useMotionValue<number>> {
  const progress = useMotionValue(0);
  const target = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      target.current = Math.min(1, window.scrollY / maxScroll);
    };

    const loop = () => {
      const current = progress.get();
      const diff = target.current - current;
      // Lerp toward scroll target — 0.06 factor = smooth but responsive
      if (Math.abs(diff) > 0.00005) {
        progress.set(current + diff * 0.06);
      }
      rafId.current = requestAnimationFrame(loop);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    rafId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [progress]);

  return progress;
}
