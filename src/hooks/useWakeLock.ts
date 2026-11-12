import { useEffect } from 'react';

interface WakeLockSentinelLike { release: () => Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

// Keeps the phone screen on while someone is following along with a real cube
// in their hands (they may go a minute between taps). Silently does nothing on
// browsers without the Screen Wake Lock API.
export const useWakeLock = (active = true) => {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = await nav.wakeLock!.request('screen');
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // low battery or not allowed: nothing to do
      }
    };
    void request();
    // The lock is dropped whenever the tab is hidden; take it again on return.
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
};
