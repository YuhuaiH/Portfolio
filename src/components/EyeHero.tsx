"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import EyeStage, { type EyeReaction } from "@/components/EyeStage";
import { useNavigationPending } from "@/components/NavigationPendingProvider";
import { useAutoplayGate } from "@/lib/usePresentationMode";
import {
  Barcode,
  CornerArrow,
  Grain,
  INK,
  pad2,
  toneFor,
} from "@/components/SpecCard";

export type Ticket = { heading: string; text: string; href: string };

// Where each ticket lands on wide screens (lg+), as a pixel offset from
// the eye's center (screen y points down), in home.json order. A mirror-
// symmetric layout: the four work sections in two columns flanking the
// eye, centered on it, and About on the center line beneath it as a base.
// Numbered in reading order — 01/02 down the left, 03/04 down the right,
// 05 below:
//
//     [01 Projects]                [03 Audio]
//                      (eye)
//     [02 Photography]             [04 Graphic]
//                   [05 About]
//
// COLUMN_X clears the eye (radius ~120px) plus a ~70px gap to each
// column's inner edge (tickets are 304px wide); ROW_Y leaves a 32px gap
// between the two 144px-tall rows.
const COLUMN_X = 340;
const ROW_Y = 88;
const BASE_Y = 262;
const SLOTS: readonly (readonly [number, number])[] = [
  [-COLUMN_X, -ROW_Y],
  [-COLUMN_X, ROW_Y],
  [COLUMN_X, -ROW_Y],
  [COLUMN_X, ROW_Y],
  [0, BASE_Y],
];

// A slot's pixel offset, plus the same direction squashed into [-1, 1]
// per axis — the range EyeStage's look-at reaction expects.
function slot(i: number) {
  const [px, py] = SLOTS[i % SLOTS.length];
  return { px, py, x: px / COLUMN_X, y: py / BASE_Y };
}

// Unit vector from a ticket back toward the eye at the center — the
// direction the eye's light comes from (see litStyle).
function toward(px: number, py: number): [number, number] {
  const len = Math.hypot(px, py) || 1;
  return [-px / len, -py / len];
}

// Parallax: the tickets drift slightly *against* the cursor, the way
// near objects do when the background's camera eases toward it (see
// SpaceBackground's CameraRig) — so they move like things floating in
// front of that scene rather than UI pinned to the glass. px of drift at
// the screen edge; each ticket gets a slightly different depth.
const PARALLAX_PX = 9;

// How long the eye gets to react (look + dilate) before navigation
// actually fires — long enough to read as a deliberate response, short
// enough that the page doesn't feel like it's stalling.
const REACTION_DELAY_MS = 380;

// Gap between one ticket popping out and the next — the "one by one".
const POP_STAGGER_MS = 110;

// Falls back to starting the entrance on a plain timer if the eye's
// onReady never fires (a load error, an offline asset, etc.) — the eye is
// the way into the whole site now, so it can't stay invisible forever just
// because the model failed to load.
const READY_FALLBACK_MS = 2500;

// ?autoplay=1 (see usePresentationMode.ts): how long the eye sits fully
// entered before the demo clicks it open, then how long the tickets hang
// in the air before it picks Photography — the film scene is the part
// being shown off.
const AUTOPLAY_EYE_HOLD_MS = 2400;
const AUTOPLAY_TICKETS_HOLD_MS = 2200;

// Once the tickets have been popped open in this visit, coming back to the
// home page (← Home, the logo) brings them straight back out after the
// eye's entrance rather than making you click the eye again every time.
const OPENED_KEY = "eye-tickets-opened";

// The project pages' spec cards sit on a flat dark page, where flat color
// is right. Here the tickets float in the lit space scene around the eye,
// and flat, evenly lit cards read as stickers on top of it — so these get
// the scene's own lighting: the eye is the light source, the same warm
// gold the canyon and the eye's haze use.
//   - shading: brightest (a warm wash) on the edge facing the eye, falling
//     off into shadow on the far side;
//   - rim: a thin warm highlight along that eye-facing edge;
//   - cast shadow: thrown *away* from the eye, not straight down;
//   - stock: a touch less saturated and bright than the flat page cards,
//     the way color sits in a dim, warm-lit scene.
function litStyle(
  color: string,
  [dx, dy]: readonly [number, number],
): CSSProperties {
  // CSS gradient angles: 0deg points up, 90deg right (screen y is down).
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return {
    color: INK,
    backgroundColor: color,
    backgroundImage: `linear-gradient(${angle.toFixed(0)}deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.08) 55%, rgba(255,228,175,0.16) 100%)`,
    boxShadow: [
      `inset ${(-dx * 1.5).toFixed(1)}px ${(-dy * 1.5).toFixed(1)}px 0 rgba(255,232,190,0.38)`,
      `${(-dx * 16).toFixed(0)}px ${(-dy * 16 + 12).toFixed(0)}px 40px -16px rgba(0,0,0,0.95)`,
      `${(dx * 6).toFixed(0)}px ${(dy * 6).toFixed(0)}px 34px -18px rgba(217,192,138,0.35)`,
    ].join(", "),
    filter: "saturate(0.86) brightness(0.93)",
  };
}

function TicketCard({
  ticket,
  index,
  toward,
  pending,
  onNavigate,
  onHoverStart,
  tabbable,
}: {
  ticket: Ticket;
  index: number;
  // Unit vector (screen space, y down) from this ticket toward the eye —
  // which side of the card the eye's light falls on.
  toward: readonly [number, number];
  pending: boolean;
  onNavigate: () => void;
  onHoverStart: () => void;
  tabbable: boolean;
}) {
  return (
    <a
      href={ticket.href}
      tabIndex={tabbable ? undefined : -1}
      // Fires once per hover ("cursor just landed here"), not on every
      // pointer move inside the card — the "detected a new subject" moment
      // the eye's focus-pulse animation is meant to react to.
      onPointerEnter={onHoverStart}
      onClick={(e) => {
        // Let modified/middle clicks behave like a normal link (new tab,
        // etc.) — only the plain-click path gets the reaction + delay.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        onNavigate();
      }}
      // A spec-sheet ticket (see SpecCard.tsx): flat section color, near-
      // black ink. Fixed size so all five match regardless of their text.
      className={`group relative flex h-36 w-full max-w-[19rem] cursor-pointer flex-col overflow-hidden rounded-[22px] px-4 pt-3 pb-2.5 text-left font-label transition-transform duration-300 ease-out sm:w-[19rem] ${
        pending
          ? "scale-95"
          : "hover:-translate-y-1 hover:scale-[1.03] active:scale-95"
      }`}
      style={{
        ...litStyle(toneFor(ticket.href), toward),
        ["--glitch-dur" as string]: `${(6.2 + index * 0.85).toFixed(2)}s`,
        ["--glitch-delay" as string]: `${(1.6 + index * 1.15).toFixed(2)}s`,
      }}
    >
      <Grain />
      {/* TV glitch (see .glitch-* in globals.css): static scanlines, plus
          a brief signal tear every few seconds — each ticket on its own
          period and offset (--glitch-dur/--glitch-delay) so they never fire
          in unison — and a short burst whenever the cursor lands on one.
          Two nested wrappers on purpose: the outer takes the hover burst,
          the inner the periodic one, so the two transform animations never
          fight over one element (and leaving hover doesn't replay one). */}
      <span aria-hidden className="glitch-scanlines" />
      <span aria-hidden className="glitch-tear" />
      <span className="glitch-hover relative flex min-h-0 flex-1 flex-col">
        <span className="glitch-body relative flex min-h-0 flex-1 flex-col">
          <div className="relative flex items-start justify-between">
            <span className="font-display text-sm font-black tracking-tight">
              {pad2(index)}
            </span>
            <span className="text-right text-[9px] leading-tight font-bold tracking-[0.06em] uppercase">
              Yuhuai Huang
              <br />
              Portfolio
            </span>
          </div>
          <div className="relative mt-auto flex items-end justify-between gap-2">
            {/* One size for every ticket, set by the longest name ("Photography")
                fitting beside the arrow — all five read as one matched set
                rather than each title scaled to its own length. */}
            <span
              className="glitch-text min-w-0 font-display text-[1.25rem] leading-none font-black tracking-[-0.02em] uppercase"
              data-text={ticket.heading}
            >
              {ticket.heading}
            </span>
            <CornerArrow className="mb-0.5 h-6 w-6 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="relative mt-2.5 flex items-center justify-between gap-3 border-t-[1.5px] border-current pt-1.5">
            <span className="truncate text-[10px] font-bold tracking-[0.1em] uppercase">
              {ticket.text}
            </span>
            <Barcode value={ticket.href} className="h-3.5 w-12 shrink-0" />
          </div>
        </span>
      </span>
    </a>
  );
}

// The home page's hero: a large 3D eyeball (EyeStage) alone in the middle
// of the page, staring at the cursor. Clicking it pops the site's tickets
// out of it one by one — each springs from the eye's center out to its own
// spot on a ring around it (see .eye-ticket in globals.css for the motion
// itself). Clicking the eye again pulls them back in, last one first.
// Below lg there's no room for a ring, so the tickets drop into a single
// column under the eye instead, still one at a time.
export default function EyeHero({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const { startNavigating } = useNavigationPending();
  const [pending, setPending] = useState<{
    href: string;
    dir: readonly [number, number];
  } | null>(null);
  const [eyeReady, setEyeReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [open, setOpen] = useState(false);
  // Bumped on every ticket pointer-enter and eye click — EyeStage watches
  // this counter (not a boolean) so the same trigger twice in a row still
  // retriggers the pulse.
  const [focusPulse, setFocusPulse] = useState(0);
  const { autoplay, started: autoplayStarted } = useAutoplayGate();
  const heroRef = useRef<HTMLDivElement>(null);

  // Written straight to CSS variables on the hero (no React state), so the
  // parallax costs a style update per pointer move, not a re-render.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = heroRef.current;
      if (!el) return;
      el.style.setProperty(
        "--px",
        ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3),
      );
      el.style.setProperty(
        "--py",
        ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const fallback = setTimeout(() => setEyeReady(true), READY_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!eyeReady) return;
    // Double rAF: without it, the very first paint after eyeReady flips
    // can land on the same frame as the "entered" state flip, so the
    // browser never sees the pre-entrance state to transition away from.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [eyeReady]);

  // Already opened earlier this visit — re-pop once the eye has faded in.
  useEffect(() => {
    if (!entered || autoplay) return;
    let opened = false;
    try {
      opened = sessionStorage.getItem(OPENED_KEY) === "1";
    } catch {}
    if (!opened) return;
    const timer = setTimeout(() => setOpen(true), 250);
    return () => clearTimeout(timer);
  }, [entered, autoplay]);

  const toggleOpen = useCallback(() => {
    setFocusPulse((n) => n + 1);
    setOpen((wasOpen) => {
      try {
        sessionStorage.setItem(OPENED_KEY, wasOpen ? "0" : "1");
      } catch {}
      return !wasOpen;
    });
  }, []);

  const handleNavigate = useCallback(
    (href: string, dir: readonly [number, number]) => {
      if (pending) return; // already on the way somewhere — ignore extra clicks
      setPending({ href, dir });
      // startNavigating() fires alongside the actual router.push — not
      // immediately on click — so the page-wide fade doesn't compete with
      // the eye's own look-and-dilate reaction for those first 380ms.
      setTimeout(() => {
        startNavigating();
        // Recording flags (?present=1, ?autoplay=1) only carry forward
        // when this navigation is itself part of an autoplay run.
        router.push(autoplay ? `${href}${window.location.search}` : href);
      }, REACTION_DELAY_MS);
    },
    [pending, autoplay, router, startNavigating],
  );

  // ?autoplay=1: let the eye's entrance play out, hold, click the eye
  // open, hold on the tickets, then pick Photography — exactly as if a
  // viewer had. FilmRollsExplorer picks up the same flag on arrival.
  useEffect(() => {
    if (!autoplay || !autoplayStarted || !entered) return;
    const index = tickets.findIndex((ticket) => ticket.href === "/photography");
    if (index === -1) return;
    const { x, y } = slot(index);
    const openTimer = setTimeout(toggleOpen, AUTOPLAY_EYE_HOLD_MS);
    const navTimer = setTimeout(
      () => handleNavigate("/photography", [x, y]),
      AUTOPLAY_EYE_HOLD_MS + AUTOPLAY_TICKETS_HOLD_MS,
    );
    return () => {
      clearTimeout(openTimer);
      clearTimeout(navTimer);
    };
  }, [autoplay, autoplayStarted, entered, tickets, handleNavigate, toggleOpen]);

  const reaction: EyeReaction = pending
    ? { dir: pending.dir, dilate: true }
    : null;

  return (
    <div
      ref={heroRef}
      className="relative mx-auto mt-6 flex max-w-sm flex-col items-center gap-4 sm:mt-8 lg:h-[640px] lg:max-w-5xl"
    >
      {/* A functional recording cue, not decorative chrome — stays visible
          even under ?present=1, gone the instant the start key lands. */}
      {autoplay && !autoplayStarted && (
        <div className="fixed inset-x-0 bottom-8 z-50 text-center text-xs tracking-[0.2em] text-accent-bright/70 uppercase">
          Press space to start
        </div>
      )}
      <div className="relative z-10 h-52 w-52 shrink-0 sm:h-60 sm:w-60 lg:absolute lg:top-[40%] lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
        {/* A soft warm halo bleeding out well past the eye's own bounds —
            a separate layer behind the canvas, since blur+opacity must
            never touch the R3F container (see below). */}
        <div
          aria-hidden
          className="animate-eye-glow pointer-events-none absolute -inset-10 rounded-full blur-3xl sm:-inset-16"
          style={{
            background:
              // Same pale gold as SpaceBackground's light, fainter and wider
              // than before — a haze the eye sits in, not a halo drawn round it.
              "radial-gradient(circle, rgba(217,192,138,0.2) 0%, rgba(217,192,138,0.07) 45%, rgba(217,192,138,0) 72%)",
          }}
        />
        {/* The fade lives on this inner div, one level below the sizing/
            centering div above — never on an ancestor of the R3F Canvas.
            R3F measures its container's size via getBoundingClientRect,
            which reflects ancestor CSS transforms; a scale transition here
            previously got baked into the canvas as a permanently
            undersized, off-center buffer. Opacity alone doesn't affect
            layout geometry, so it can't cause the same bug. */}
        <div
          className={`h-full w-full transition-opacity duration-700 ease-out ${
            entered ? "opacity-100" : "opacity-0"
          }`}
        >
          <EyeStage
            reaction={reaction}
            focusPulse={focusPulse}
            onReady={() => setEyeReady(true)}
          />
        </div>
        {/* The eye itself is the button — a round hit area laid over the
            canvas rather than a click handler on the 3D mesh, so it's a
            real focusable, keyboard-operable control. */}
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="absolute inset-[12%] cursor-pointer rounded-full focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent-bright/60"
        />
        <p
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 -bottom-7 text-center text-[11px] tracking-[0.25em] text-accent-bright/70 uppercase transition-opacity duration-500 ${
            entered && !open ? "animate-pulse opacity-100" : "opacity-0"
          }`}
        >
          Click the eye
        </p>
      </div>
      <nav
        aria-label="Main"
        className="mt-6 flex w-full flex-col items-center gap-4 lg:contents"
      >
        {tickets.map((ticket, i) => {
          const { px, py, x, y } = slot(i);
          // Out one by one in order; back in last-first, so the ring
          // closes up the same way it opened, just reversed.
          const delay = (open ? i : tickets.length - 1 - i) * POP_STAGGER_MS;
          return (
            <div
              key={ticket.href}
              data-open={open}
              className="eye-ticket w-full"
              style={
                {
                  "--ring-x": `${px}px`,
                  "--ring-y": `${py}px`,
                  "--pop-delay": `${delay}ms`,
                } as CSSProperties
              }
            >
              {/* Its own element: .eye-ticket's transform is already spent on
                  the pop-out animation, and the card's on its hover scale. */}
              <div
                className="flex w-full justify-center transition-transform duration-700 ease-out"
                style={{
                  transform: `translate3d(calc(var(--px, 0) * ${-(PARALLAX_PX + i * 1.5)}px), calc(var(--py, 0) * ${-(PARALLAX_PX * 0.6 + i)}px), 0)`,
                }}
              >
                <TicketCard
                  ticket={ticket}
                  index={i + 1}
                  toward={toward(px, py)}
                  pending={pending?.href === ticket.href}
                  tabbable={open}
                  onNavigate={() => handleNavigate(ticket.href, [x, y])}
                  onHoverStart={() => setFocusPulse((n) => n + 1)}
                />
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
