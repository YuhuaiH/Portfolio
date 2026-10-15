"use client";

import { useEffect, useState } from "react";

// Recording-only toggle: append ?present=1 to the URL before screen-capturing
// a demo to hide the header/nav/footer chrome, leaving just the scene itself
// in frame. Read directly off window.location rather than next/navigation's
// useSearchParams — that hook opts the whole static-exported page out of
// prerendering unless wrapped in a Suspense boundary, which is unnecessary
// machinery for a dev-only recording aid nobody hits through normal
// navigation.
export function usePresentationMode(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(new URLSearchParams(window.location.search).get("present") === "1");
  }, []);

  return active;
}

// A second, independent recording flag (?autoplay=1) that drives the eye,
// then the film scene, through a scripted showcase — auto-navigating into
// Work and pulling one roll out — so a screen capture doesn't need a hand
// driving the interaction. Kept separate from presentation mode: you may
// want the chrome hidden without the demo running, or vice versa while
// blocking out shots.
export function useAutoplayDemo(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(new URLSearchParams(window.location.search).get("autoplay") === "1");
  }, []);

  return active;
}

const AUTOPLAY_STARTED_KEY = "autoplay-started";

// Gates ?autoplay=1 behind a keypress (Space) instead of firing the instant
// the eye page loads — recording rarely lines up perfectly with a page
// load, so this lets you get the capture rolling first and press start
// exactly when you're ready. The showcase only needs that press once, on
// the eye page where it begins: sessionStorage carries the "already
// started" flag across the auto-navigation into /work, so the film scene
// picks up and keeps going on its own timers rather than stopping to wait
// for a second press. Loading /work?autoplay=1 directly (no prior press
// this session) waits for its own keypress instead, so the film-only beats
// stay testable on their own.
export function useAutoplayGate(): { autoplay: boolean; started: boolean } {
  const autoplay = useAutoplayDemo();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!autoplay) return;
    if (sessionStorage.getItem(AUTOPLAY_STARTED_KEY) === "1") {
      setStarted(true);
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== " " && e.code !== "Space") return;
      e.preventDefault();
      sessionStorage.setItem(AUTOPLAY_STARTED_KEY, "1");
      setStarted(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoplay]);

  return { autoplay, started };
}
