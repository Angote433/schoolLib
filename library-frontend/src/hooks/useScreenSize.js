import { useState, useEffect } from 'react';
import { breakpoints } from '../styles/tokens';

// ── SCREEN SIZE HOOK ──────────────────────────────────────────────────
// Single source of truth for responsive JS branching across the app.
// The codebase uses inline JS style objects (no CSS files), so
// components that need to render *different markup* on small screens
// (not just different styling) read isMobile/isTablet/isDesktop from
// here instead of relying on CSS media queries.
//
// isMobile:  < 640px
// isTablet:  640px – 1024px
// isDesktop: > 1024px

function classify(width) {
  return {
    isMobile: width < breakpoints.mobile,
    isTablet: width >= breakpoints.mobile && width <= breakpoints.tablet,
    isDesktop: width > breakpoints.tablet,
  };
}

export default function useScreenSize() {
  const [size, setSize] = useState(() =>
    classify(typeof window !== 'undefined' ? window.innerWidth : breakpoints.tablet + 1)
  );

  useEffect(() => {
    let debounceId;

    const handleChange = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        setSize(classify(window.innerWidth));
      }, 120);
    };

    window.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);

    return () => {
      clearTimeout(debounceId);
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);
    };
  }, []);

  return size;
}
