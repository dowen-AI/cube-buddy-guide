import { useSyncExternalStore } from 'react';

// True while the CSS media query matches; follows rotation and window resizing.
export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
