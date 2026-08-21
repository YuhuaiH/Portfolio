"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNavigationPending } from "./NavigationPendingProvider";

const FADE_MS = 200;

// Next's App Router swaps route content instantly — this holds onto the
// outgoing page just long enough to fade it out before swapping in the
// new one and fading that in, so switching between routes (e.g. the
// film/digital scenes) reads as a transition rather than an abrupt cut.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pending } = useNavigationPending();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [visible, setVisible] = useState(true);
  const prevPathnameRef = useRef(pathname);

  // Fades out the instant a navigation is marked pending (see
  // NavigationPendingProvider) rather than waiting for the pathname
  // itself to change below — that's what left a dead, unresponsive gap
  // between a click and the route actually resolving. If the wait is
  // long, the page just stays faded until the effect below swaps content
  // in — still better than no feedback at all.
  useEffect(() => {
    if (pending) setVisible(false);
  }, [pending]);

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
