"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FADE_MS = 200;

// Next's App Router swaps route content instantly — this holds onto the
// outgoing page just long enough to fade it out before swapping in the
// new one and fading that in, so switching between routes (e.g. the
// film/digital scenes) reads as a transition rather than an abrupt cut.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [visible, setVisible] = useState(true);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current === pathname) {
      // Same route, just updated content (e.g. new props) — swap right away.
      setDisplayChildren(children);
      return;
    }
    prevPathnameRef.current = pathname;
    setVisible(false);
    const timeout = setTimeout(() => {
      setDisplayChildren(children);
      setVisible(true);
    }, FADE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      className="transition-opacity ease-out"
      style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
    >
      {displayChildren}
    </div>
  );
}
