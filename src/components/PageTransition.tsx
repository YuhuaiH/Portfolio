"use client";

import { usePathname } from "next/navigation";
import { useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useNavigationPending } from "./NavigationPendingProvider";

// Keeps showing the page it first mounted with, even after the route
// changes. In the App Router, a layout's `children` is not the page itself
// but a router element that renders whatever route is *current* — so
// merely holding on to the old `children` during the exit didn't keep the
// old page on screen: the new one rendered straight into it mid-fade (it's
// prefetched, so usually instantly), got faded out with the exit, then
// played its entrance — a visible blink. Freezing the router context the
// page reads from is what actually holds the outgoing page until the swap.
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const [frozen] = useState(context);
  return <LayoutRouterContext.Provider value={frozen}>{children}</LayoutRouterContext.Provider>;
}

// Next's App Router swaps route content instantly — this choreographs the
// swap instead, in three phases:
//
//   exit   the outgoing page leaves. Leaving the home page it zooms in
//          toward the eye, blurring as it fades — being pulled *into* the
//          eye; between subpages it just lifts away and fades.
//   (swap) the new route's content replaces the old the moment both the
//          exit has played out and the route has resolved — whichever is
//          later, never a fixed extra wait on top.
//   enter  the incoming page rises in from slightly below as it fades in.
//
// The exit starts the instant a navigation is marked pending (see
// NavigationPendingProvider) — at the click, not once Next's router has
// resolved — so there's never a dead moment between click and motion.
//
// Entering pages never get a scale transform, only translate/opacity: a
// page mounting its 3D canvas (the film scene) while an ancestor is scaled
// would have R3F measure the scaled size and bake in a wrong-sized buffer
// (see the note in EyeHero.tsx). Exiting pages can scale freely — their
// canvases are on their way out and never measured again.
const EXIT_MS = 420;
const ENTER_MS = 560;
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 0.75, 0.25)";

type Phase = "idle" | "exit" | "enter-from" | "enter";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pending } = useNavigationPending();
  const reduced = useReducedMotion();
  // Which route is on screen. Bumping it remounts FrozenRouter, re-freezing
  // it on the route that's current by then — that's the swap.
  const [shownKey, setShownKey] = useState(pathname);
  const [phase, setPhase] = useState<Phase>("idle");
  // Whether the page now leaving is the home page — picks the exit style.
  const [fromHome, setFromHome] = useState(pathname === "/");
  const prevPathnameRef = useRef(pathname);
  const exitStartRef = useRef<number | null>(null);

  function beginExit() {
    if (exitStartRef.current !== null) return;
    exitStartRef.current = performance.now();
    setFromHome(prevPathnameRef.current === "/");
    setPhase("exit");
  }

  useEffect(() => {
    if (pending) beginExit();
  }, [pending]);

  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    // The route resolved. Start the exit now if nothing marked it pending
    // (e.g. browser back/forward), then swap once it has fully played.
    beginExit();
    prevPathnameRef.current = pathname;
    const elapsed = performance.now() - (exitStartRef.current ?? performance.now());
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf1 = 0;
    let raf2 = 0;
    timers.push(
      setTimeout(() => {
        exitStartRef.current = null;
        setShownKey(pathname);
        window.scrollTo(0, 0);
        setPhase("enter-from");
        // Two frames so the browser paints the "from" pose before the
        // transition to rest begins — otherwise it would just snap.
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setPhase("enter"));
        });
        timers.push(setTimeout(() => setPhase("idle"), ENTER_MS + 50));
      }, Math.max(0, (reduced ? 150 : EXIT_MS) - elapsed))
    );
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  let style: CSSProperties;
  if (reduced) {
    // Reduced motion: a plain crossfade, nothing moves.
    style = {
      opacity: phase === "exit" || phase === "enter-from" ? 0 : 1,
      transition: phase === "enter-from" ? "none" : "opacity 150ms ease-out",
    };
  } else if (phase === "exit") {
    style = {
      opacity: 0,
      // Home: zoom toward the eye (it sits ~40% down the hero), as if the
      // view is falling into it. Elsewhere: a short lift away.
      transform: fromHome ? "scale(1.08)" : "translateY(-10px)",
      transformOrigin: "50% 38%",
      filter: fromHome ? "blur(8px)" : "blur(3px)",
      transition: `opacity ${EXIT_MS}ms ${EASE_IN}, transform ${EXIT_MS}ms ${EASE_IN}, filter ${EXIT_MS}ms ${EASE_IN}`,
    };
  } else if (phase === "enter-from") {
    style = { opacity: 0, transform: "translateY(14px)", transition: "none" };
  } else if (phase === "enter") {
    style = {
      opacity: 1,
      transform: "translateY(0)",
      transition: `opacity ${ENTER_MS}ms ${EASE_OUT}, transform ${ENTER_MS}ms ${EASE_OUT}`,
    };
  } else {
    // At rest: no transform/filter at all, so nothing here creates a
    // containing block or stacking context that could affect the page.
    style = {};
  }

  return (
    <div style={style} className={phase === "idle" ? "" : "will-change-[opacity,transform]"}>
      <FrozenRouter key={shownKey}>{children}</FrozenRouter>
    </div>
  );
}
