import { useEffect } from 'react';

export function useCinematicScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animationFrameId = null;

    const handleScroll = () => {
      if (animationFrameId) return;

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;

        // Target row sections and major content blocks (not individual cards)
        const targets = document.querySelectorAll(
          '.cinematic-scroll-item, .movie-row, .hero-section'
        );
        const windowHeight = window.innerHeight;

        targets.forEach((el) => {
          const rect = el.getBoundingClientRect();

          // Out of viewport range
          if (rect.bottom < -100 || rect.top > windowHeight + 100) {
            el.style.opacity = '1';
            el.style.transform = 'translate3d(0, 0, 0)';
            return;
          }

          let opacity = 1;
          let translateY = 0;

          // 1. Subtle entry from bottom (starts at opacity 0.70, translateY 15px)
          if (rect.top > windowHeight * 0.75) {
            const progress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight * 0.25)));
            opacity = 0.70 + 0.30 * progress;
            translateY = 15 * (1 - progress);
          }
          // 2. Gentle exit past top of viewport (gradual 1.0 -> 0.75, max 0.60 as it leaves)
          else if (rect.bottom < windowHeight * 0.40) {
            const progress = Math.max(0, Math.min(1, rect.bottom / (windowHeight * 0.40)));
            opacity = 0.60 + 0.40 * progress;
            translateY = -10 * (1 - progress);
          }
          // 3. Primary viewport area (Fully solid 1.0 opacity)
          else {
            opacity = 1;
            translateY = 0;
          }

          el.style.opacity = opacity.toFixed(2);
          el.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial calculation
    handleScroll();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [enabled]);
}
