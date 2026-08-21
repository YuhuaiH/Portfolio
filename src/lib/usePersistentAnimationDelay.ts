"use client";

import { useEffect, useState } from "react";

// A negative CSS animation-delay (e.g. "-42.3s") that makes a long-running
// animation *look* continuous across page navigations, rather than
// restarting from 0% every time its element remounts — which happens on
// every route change for anything mounted in layout.tsx, since Next
// re-renders that subtree per navigation. A CSS animation has no memory of
// its own across a remount; the trick is tracking real wall-clock start
// time somewhere that *does* survive it (sessionStorage, not component
// state) and computing an offset delay from that on each mount, so the new
// element instance picks up mid-cycle instead of at the beginning.
//
// sessionStorage, not localStorage: meant to survive moving around the
// site in one visit, not persist forever across separate ones — a return
// visitor starting the cycle over isn't the problem this solves.
//
// Returns "0s" for the first client render (can't touch sessionStorage
// during SSR/hydration without a mismatch), then the real offset once the
// effect runs — a one-frame flash of the un-offset start, not a visible
// restart.
export function usePersistentAnimationDelay(key: string, durationSeconds: number): string {
  const [delay, setDelay] = useState("0s");

  useEffect(() => {
    const storageKey = `anim-start:${key}`;
    let start = Number(sessionStorage.getItem(storageKey));
    if (!start) {
      start = Date.now();
      sessionStorage.setItem(storageKey, String(start));
    }
    const elapsedSeconds = (Date.now() - start) / 1000;
    const offset = elapsedSeconds % durationSeconds;
    setDelay(`-${offset}s`);
  }, [key, durationSeconds]);

  return delay;
}
