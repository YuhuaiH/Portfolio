"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import EyeStage, { type EyeReaction } from "@/components/EyeStage";
import { renderInlineText } from "@/lib/content";
import { useNavigationPending } from "@/components/NavigationPendingProvider";

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

// Wobbles each icon's straight vector paths into a slightly uneven,
// hand-inked line — the one thing that reliably reads as "old" about a
// glyph regardless of what shape it is, since the shapes themselves are
// still plain geometric icons. Defined once, referenced by every Icon via
// CSS `filter: url(#icon-ink)`; a 0×0 SVG so it never takes up layout
// space of its own. feDisplacementMap needs an actual filter primitive
// graph (not a data-URI background image) to distort existing vector
// content rather than paint a texture on top of it, so this has to live
// inline in the DOM rather than reuse the data-URI pattern used elsewhere
// in this codebase for grain/scratches.
function IconInkFilter() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <filter id="icon-ink" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="0.9"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

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
      style={{ filter: "url(#icon-ink)" }}
    >
      {path}
    </svg>
  );
}

const CARD_CLASSES =
  "group relative flex w-full max-w-[21rem] items-stretch rounded-2xl border backdrop-blur-md transition-all duration-300 ease-out sm:w-80";

// Fine paper-fiber grain (same feTurbulence + contrast-boost recipe as the
// logo's grain in SiteHeader.tsx, just re-tiled smaller for the card's
// scale) plus two soft brown blotches standing in for foxing — the
// age-spot staining real old paper picks up, concentrated unevenly rather
// than as a uniform tint. multiply blend so both darken into the card's
// existing glass gradient instead of sitting on top of it as a flat layer.
// Its own inset-0 span with `rounded-2xl overflow-hidden` clips the grain
// tile to the card's shape without needing overflow-hidden on the card
// itself — see the note on Perforation below for why that's off-limits.
const PAPER_GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch' result='t'/%3E%3CfeColorMatrix in='t' type='saturate' values='0' result='g'/%3E%3CfeComponentTransfer in='g'%3E%3CfeFuncR type='linear' slope='2.2' intercept='-0.6'/%3E%3CfeFuncG type='linear' slope='2.2' intercept='-0.6'/%3E%3CfeFuncB type='linear' slope='2.2' intercept='-0.6'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E";

function PaperTexture() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl mix-blend-multiply opacity-25"
      style={{
        backgroundImage: [
          `url("${PAPER_GRAIN}")`,
          "radial-gradient(ellipse 60% 45% at 22% 18%, rgba(74,54,24,0.22), transparent 65%)",
          "radial-gradient(ellipse 55% 40% at 82% 78%, rgba(74,54,24,0.18), transparent 65%)",
        ].join(", "),
        backgroundSize: "50px 50px, cover, cover",
        backgroundRepeat: "repeat, no-repeat, no-repeat",
      }}
    />
  );
}

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
      <div className="absolute inset-y-3 left-0 border-l border-dashed border-accent-bright/30" />
      <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-background" />
      <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-background" />
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
        className="h-6 w-6 text-accent-bright/55 transition-colors duration-300 group-hover:text-accent-bright"
      />
    </div>
  );
  const body = (
    <div
      className={`flex min-w-0 flex-1 flex-col justify-center gap-1 px-5 py-4 ${
        mirrored ? "text-right" : "text-left"
      }`}
    >
      <p className="text-[11px] font-bold tracking-[0.22em] text-accent-bright/85 uppercase">
        {renderInlineText(box.heading)}
      </p>
      {/* break-words: the email address on the Contact card is one long
          unbroken string with no spaces for the browser's default
          whitespace-only wrapping to break on — without this it just ran
          past the card's own edge instead of wrapping. */}
      <p className="font-heading text-lg tracking-wide break-words text-foreground italic">
        {renderInlineText(box.text)}
        {showArrow && (
          <span className="ml-1.5 inline-block -translate-x-1 text-accent-bright opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
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
  onHoverStart,
}: {
  box: Box & { href: string };
  mirrored: boolean;
  dir: readonly [number, number];
  pending: boolean;
  onNavigate: (href: string, dir: readonly [number, number]) => void;
  onHoverStart: () => void;
}) {
  return (
    <a
      href={box.href}
      // Fires once per hover ("cursor just landed here"), not on every
      // pointer move inside the card — pointerenter, unlike pointermove,
      // only fires on entry, which is exactly the "detected a new subject"
      // moment the eye's focus-pulse animation is meant to react to.
      onPointerEnter={onHoverStart}
      onClick={(e) => {
        // Let modified/middle clicks behave like a normal link (new tab,
        // etc.) — only the plain-click path gets the reaction + delay.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate(box.href, dir);
      }}
      className={`${CARD_CLASSES} cursor-pointer ${
        pending
          ? "scale-95 border-accent-bright/70 bg-gradient-to-b from-accent/[0.32] to-background/40 shadow-[0_0_55px_-8px_rgba(219,168,63,0.8)]"
          : "border-accent-bright/30 bg-gradient-to-b from-accent/[0.2] to-background/30 shadow-[0_0_30px_-10px_rgba(219,168,63,0.6)] hover:-translate-y-1 hover:scale-[1.04] hover:border-accent-bright/65 hover:from-accent/[0.32] hover:shadow-[0_0_55px_-8px_rgba(219,168,63,0.8)] active:scale-95"
      }`}
    >
      <PaperTexture />
      <BoxContent box={box} mirrored={mirrored} showArrow />
    </a>
  );
}

function InfoBox({ box, mirrored }: { box: Box; mirrored: boolean }) {
  return (
    <div
      className={`${CARD_CLASSES} border-accent-bright/18 bg-gradient-to-b from-accent/[0.12] to-background/30 shadow-[0_0_22px_-14px_rgba(219,168,63,0.4)] hover:border-accent-bright/35`}
    >
      <PaperTexture />
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
  const { startNavigating } = useNavigationPending();
  const [pending, setPending] = useState<{ href: string; dir: readonly [number, number] } | null>(
    null
  );
  const [eyeReady, setEyeReady] = useState(false);
  const [entered, setEntered] = useState(false);
  // Bumped on every NavCard pointer-enter — EyeStage watches this counter
  // (not a boolean) so hovering the *same* card twice in a row still
  // retriggers the pulse, which a boolean flip wouldn't if it was already
  // true from a still-playing previous pulse.
  const [focusPulse, setFocusPulse] = useState(0);

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
    // startNavigating() fires here, alongside the actual router.push —
    // not immediately on click — so the page-wide fade doesn't compete
    // with the eye's own look-and-dilate reaction for those first 380ms;
    // the eye gets its moment, then the transition takes over once
    // navigation is genuinely starting.
    setTimeout(() => {
      startNavigating();
      router.push(href);
    }, REACTION_DELAY_MS);
  }

  const reaction: EyeReaction = pending ? { dir: pending.dir, dilate: true } : null;

  return (
    <div className="relative mx-auto mt-6 flex max-w-sm flex-col items-center gap-5 sm:mt-8 sm:h-[440px] sm:max-w-5xl">
      <IconInkFilter />
      <div className="relative h-52 w-52 shrink-0 sm:absolute sm:top-1/2 sm:left-1/2 sm:h-60 sm:w-60 sm:-translate-x-1/2 sm:-translate-y-1/2">
        {/* A soft warm halo bleeding out well past the eye's own bounds —
            candlelight around it rather than a hard-edged render sitting on
            the page. Blurred, not animated in sync with anything else, but
            given its own slow breathing pulse so it reads as ambient light
            rather than a flat static glow; a separate layer behind the
            canvas (not on the canvas/its wrapper) since blur+opacity here
            must never touch the R3F container — see the comment below on
            why that div can't pick up a stray transform/filter either. */}
        <div
          aria-hidden
          className="animate-eye-glow pointer-events-none absolute -inset-10 rounded-full blur-3xl sm:-inset-16"
          style={{
            background:
              "radial-gradient(circle, rgba(219,168,63,0.35) 0%, rgba(219,168,63,0) 70%)",
          }}
        />
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
          <EyeStage
            reaction={reaction}
            focusPulse={focusPulse}
            onReady={() => setEyeReady(true)}
          />
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
                onHoverStart={() => setFocusPulse((n) => n + 1)}
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
