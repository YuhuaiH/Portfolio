"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type NavigationPendingContextValue = {
  pending: boolean;
  startNavigating: () => void;
};

const NavigationPendingContext = createContext<NavigationPendingContextValue | null>(null);

// Every plain <Link> in the site relies on Next's own pathname change to
// know a navigation happened — which only fires *after* the next route has
// actually resolved. The gap between a click and that moment (a dev-server
// on-demand compile, a slow connection, whatever) had zero visual
// feedback: nothing responded until the swap did, which read as a dead
// pause. startNavigating() lets any nav trigger (a Link's onClick,
// EyeHero's custom handler) mark a navigation as pending immediately,
// before Next's router has resolved anything — PageTransition.tsx reads
// `pending` to begin its fade-out right then, instead of waiting for the
// pathname to catch up.
export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    // The pathname actually changing is the ground-truth signal that
    // whatever navigation was pending has now resolved — clear it here
    // rather than trusting every trigger to remember to reset it.
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setPending(false);
    }
  }, [pathname]);

  return (
    <NavigationPendingContext.Provider value={{ pending, startNavigating: () => setPending(true) }}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    throw new Error("useNavigationPending must be used within a NavigationPendingProvider");
  }
  return ctx;
}
