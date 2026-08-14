"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import EyeStage, { type EyeReaction } from "@/components/EyeStage";
import { renderInlineText } from "@/lib/content";

type Box = { heading: string; text: string; href?: string };

// One card per corner around the centered eye, in reading order (top-left,
// top-right, bottom-left, bottom-right) — matches the order boxes are
// listed in home.json. Position (where the card sits) and alignment (how
// its own content hugs that corner) are separate class lists because the
// entrance wrapper below needs the position classes on itself while the
// alignment classes stay on the card's own flex column. CORNER_DIRS is
// the matching look-direction for each corner (same [-1, 1] per-axis
// range EyeStage's reaction prop expects, and also what a card slides in
// from on mount), so clicking a card makes the eye glance toward it.
const CORNER_POSITION_CLASSES = [
  "sm:absolute sm:left-0 sm:top-0",
  "sm:absolute sm:right-0 sm:top-0",
  "sm:absolute sm:bottom-0 sm:left-0",
  "sm:absolute sm:right-0 sm:bottom-0",
];
// Ticket orientation per corner: the icon "stub" sits on the card's outer
// edge — left for the left-corner cards, mirrored to the right for the
// right-corner ones — the way a real ticket stub stays on one consistent
// side rather than however the ticket happens to be facing.
const CORNER_MIRRORED = [false, true, false, true];
const CORNER_DIRS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

// How long the eye gets to react (look + dilate) before navigation
// actually fires — long enough to read as a deliberate response, short
// enough that the page doesn't feel like it's stalling.
const REACTION_DELAY_MS = 380;

// Minimal line icons, one per box heading — inline rather than an icon
// dependency for four one-off glyphs. 1.5px stroke, currentColor, so they
// pick up each card's text color (and its hover/pending shifts) for free.
const ICONS: Record<string, ReactNode> = {
  Work: (
    <path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z M12 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
  ),
  About: (
    <path d="M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
  ),
  Contact: <path d="M3.5 5.5h17v13h-17zM4 7l8 6 8-6" />,
  Elsewhere: (
    <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16" />
  ),
};

function Icon({ heading, className }: { heading: string; className: string }) {
  const path = ICONS[heading];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  );
}

const CARD_CLASSES =
  "group relative flex w-full max-w-[21rem] items-stretch rounded-2xl border backdrop-blur-md transition-all duration-300 ease-out sm:w-80";

// The perforated tear-line between a ticket's stub and its main body: a
// dashed rule plus two small circles punched through the card's own top
// and bottom edges. The circles are solid page-background color rather
// than actually cut — this card sits on a plain black page, so a matching
// solid fill reads identically to a real punch-through without needing a
// mask. They're positioned outside the card's own border-box on purpose
// (half in, half out), which is also why the card can't have
// overflow-hidden — that would clip the very notches it's showing off.
function Perforation() {
  return (
    <div className="relative w-px shrink-0 self-stretch">
      <div className="absolute inset-y-3 left-0 border-l border-dashed border-white/20" />
      <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-black" />
    </div>
  );
}

function BoxContent({
  box,
  mirrored,
  showArrow,
}: {
  box: Box;
  mirrored: boolean;
  showArrow?: boolean;
}) {
  const stub = (
    <div className="flex w-14 shrink-0 items-center justify-center sm:w-16">
      <Icon
        heading={box.heading}
        className="h-6 w-6 text-muted/60 transition-colors duration-300 group-hover:text-[#ff8f5e]"
      />
    </div>
  );
  const body = (
    <div
      className={`flex min-w-0 flex-1 flex-col justify-center gap-1 px-5 py-4 ${
        mirrored ? "text-right" : "text-left"
      }`}
    >
      <p className="text-[11px] tracking-[0.15em] text-muted/70 uppercase">
        {renderInlineText(box.heading)}
      </p>
      {/* break-words: the email address on the Contact card is one long
          unbroken string with no spaces for the browser's default
          whitespace-only wrapping to break on — without this it just ran
          past the card's own edge instead of wrapping. */}
      <p className="font-heading text-lg tracking-wide break-words text-foreground/90">
        {renderInlineText(box.text)}
        {showArrow && (
          <span className="ml-1.5 inline-block -translate-x-1 text-[#ff8f5e] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            →
          </span>
        )}
      </p>
    </div>
  );

  return mirrored ? (
    <>
      {body}
      <Perforation />
      {stub}
    </>
  ) : (
    <>
      {stub}
      <Perforation />
      {body}
    </>
  );
}

function NavCard({
  box,
  mirrored,
  dir,
  pending,
  onNavigate,
}: {
  box: Box & { href: string };
  mirrored: boolean;
  dir: readonly [number, number];
  pending: boolean;
  onNavigate: (href: string, dir: readonly [number, number]) => void;
}) {
  return (
    <a
      href={box.href}
      onClick={(e) => {
        // Let modified/middle clicks behave like a normal link (new tab,
        // etc.) — only the plain-click path gets the reaction + delay.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate(box.href, dir);
      }}
      className={`${CARD_CLASSES} cursor-pointer ${
        pending
          ? "scale-95 border-[#ff8f5e]/60 bg-gradient-to-b from-white/[0.09] to-white/[0.02] shadow-[0_0_45px_-10px_rgba(255,143,94,0.55)]"
          : "border-white/20 bg-gradient-to-b from-white/[0.07] to-white/[0.015] shadow-[0_0_30px_-16px_rgba(255,143,94,0.55)] hover:-translate-y-1 hover:scale-[1.04] hover:border-[#ff8f5e]/40 hover:from-white/[0.09] hover:shadow-[0_0_50px_-12px_rgba(255,143,94,0.45)] active:scale-95"
      }`}
    >
      <BoxContent box={box} mirrored={mirrored} showArrow />
    </a>
  );
}

function InfoBox({ box, mirrored }: { box: Box; mirrored: boolean }) {
  return (
    <div
      className={`${CARD_CLASSES} border-white/20 bg-gradient-to-b from-white/[0.07] to-white/[0.015] shadow-[0_0_26px_-16px_rgba(255,255,255,0.5)] hover:border-white/30`}
    >
      <BoxContent box={box} mirrored={mirrored} />
    </div>
  );
}

// Positions a card at its corner and, on mount, animates it sliding in
// from that same corner's direction while fading in — an entrance for the
// nav rather than everything just being present on first paint. Position
// lives on this wrapper (not the card itself) so the card's own hover/
// press transforms — which need their own `transform`, not one already
// spent on the entrance slide — stay untouched.
function EntranceSlot({
  positionClassName,
  dir,
  visible,
  delayMs,
  children,
}: {
  positionClassName: string;
  dir: readonly [number, number];
  visible: boolean;
  delayMs: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`w-full transition-all duration-500 ease-out sm:w-auto ${positionClassName}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0, 0)" : `translate(${dir[0] * 22}px, ${dir[1] * 22}px)`,
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Falls back to starting the entrance on a plain timer if the eye's
// onReady never fires (a load error, an offline asset, etc.) — the nav
// cards are the actual navigation for the whole site, so they can't stay
// invisible forever just because the eye failed to load.
const READY_FALLBACK_MS = 2500;

// The home page's hero: a large 3D eyeball (EyeStage) centered on the
// page, staring at the cursor, with the site's navigation in textboxes
// floating around it. Below sm, there's no room for corners around a
// centered eye, so everything collapses into a single stacked column
// instead — the eye first, then each box in turn. The eye fades/scales in
// once it's actually loaded (not just mounted — see EyeStage's onReady)
// and the cards cascade in afterward, each sliding in from the direction
// of its own corner — an introduction for the page rather than the whole
// hero just appearing at once.
export default function EyeHero({ boxes }: { boxes: Box[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<{ href: string; dir: readonly [number, number] } | null>(
    null
  );
  const [eyeReady, setEyeReady] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const fallback = setTimeout(() => setEyeReady(true), READY_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!eyeReady) return;
    // Double rAF: without it, the very first paint after eyeReady flips
    // can land on the same frame as the "entered" state flip, so the
    // browser never sees the pre-entrance (offset/transparent) state to
    // transition away from — everything would just appear instantly
    // instead of animating in.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [eyeReady]);

  function handleNavigate(href: string, dir: readonly [number, number]) {
    if (pending) return; // already on the way somewhere — ignore extra clicks
    setPending({ href, dir });
    setTimeout(() => router.push(href), REACTION_DELAY_MS);
  }

  const reaction: EyeReaction = pending ? { dir: pending.dir, dilate: true } : null;

  return (
    <div className="relative mx-auto mt-6 flex max-w-sm flex-col items-center gap-5 sm:mt-8 sm:h-[440px] sm:max-w-5xl">
      <div className="h-52 w-52 shrink-0 sm:absolute sm:top-1/2 sm:left-1/2 sm:h-60 sm:w-60 sm:-translate-x-1/2 sm:-translate-y-1/2">
        {/* The fade lives on this inner div, one level below the sizing/
            centering div above — never on an ancestor of the R3F Canvas.
            R3F measures its container's size via getBoundingClientRect,
            which reflects ancestor CSS transforms; a `scale-75→100` here
            previously got measured mid-transition and baked into the
            canvas as a permanently undersized, left-anchored buffer —
            exactly why the eye looked off-center. Opacity alone doesn't
            affect layout geometry, so it can't cause the same bug. */}
        <div
          className={`h-full w-full transition-opacity duration-700 ease-out ${
            entered ? "opacity-100" : "opacity-0"
          }`}
        >
          <EyeStage reaction={reaction} onReady={() => setEyeReady(true)} />
        </div>
      </div>
      {boxes.map((box, i) => {
        const dir = CORNER_DIRS[i % CORNER_DIRS.length];
        const positionClassName = CORNER_POSITION_CLASSES[i % CORNER_POSITION_CLASSES.length];
        const mirrored = CORNER_MIRRORED[i % CORNER_MIRRORED.length];
        return (
          <EntranceSlot
            key={box.heading}
            positionClassName={positionClassName}
            dir={dir}
            visible={entered}
            delayMs={160 + i * 110}
          >
            {box.href ? (
              <NavCard
                box={box as Box & { href: string }}
                mirrored={mirrored}
                dir={dir}
                pending={pending?.href === box.href}
                onNavigate={handleNavigate}
              />
            ) : (
              <InfoBox box={box} mirrored={mirrored} />
            )}
          </EntranceSlot>
        );
      })}
    </div>
  );
}
