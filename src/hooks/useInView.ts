import { useEffect, useRef, useState } from 'react';

// Tracks whether an element is on screen, so off-screen 3D canvases can stop
// their per-frame render loop.
export const useInView = <T extends Element>(rootMargin = '200px') => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
};
