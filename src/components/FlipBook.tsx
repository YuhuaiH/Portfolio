"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

// A photobook you page through like the real thing. Each page image is a
// full two-page *spread* (left + right page in one file, the way book
// layouts are exported); the book splits every spread down its spine and
// stacks the halves as leaves:
//
//   leaf k — front: right half of spread k
//            back:  left half of spread k + 1
//
// Turning a page rotates one leaf 180° around the spine (CSS 3D), carrying
// the current right page over to become the next spread's left page while
// uncovering the next spread's right page beneath it. Nothing is cut into
// separate files: each half is the same image, background-sized to 200%
// and anchored left or right.
//
// Click the right page (or →) for the next spread, the left page (or ←)
// for the previous one.

const TURN_MS = 900;

function half(src: string, side: "left" | "right"): CSSProperties {
  return {
    backgroundImage: `url("${src}")`,
    backgroundSize: "200% 100%",
    backgroundPosition: side === "left" ? "0% 0" : "100% 0",
  };
}

export default function FlipBook({ pages, aspectRatio }: { pages: string[]; aspectRatio: string }) {
  const leaves = pages.length - 1;
  // How many leaves have been turned — 0 shows spread 1.
  const [turned, setTurned] = useState(0);
  // The leaf mid-turn, lifted above every other leaf until it lands, so it
  // never slides *under* the stack it's turning over.
  const [turning, setTurning] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = Math.min(Math.max(turned + dir, 0), leaves);
      if (next === turned) return;
      // Forward turns leaf `turned`; backward turns back leaf `next`.
      setTurning(dir === 1 ? turned : next);
      setTurned(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTurning(null), TURN_MS);
    },
    [turned, leaves]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  if (pages.length === 0) return null;

  // Stacking: unturned leaves pile on the right with the next page on top;
  // turned leaves pile on the left with the most recent on top.
  const z = (k: number) => (k === turning ? leaves + 2 : k < turned ? k + 1 : leaves - k + 1);

  return (
    <figure className="mt-8 first:mt-0">
      <div
        role="group"
        aria-roledescription="book"
        aria-label={`Spread ${turned + 1} of ${pages.length}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
        }}
        className="relative w-full rounded-[4px] outline-none [perspective:2400px] focus-visible:ring-1 focus-visible:ring-foreground/40"
        style={{ aspectRatio }}
      >
        {/* The pages lying flat under the leaves: the first spread's left
            page and the last spread's right page. */}
        <div className="absolute inset-y-0 left-0 w-1/2 bg-black" style={half(pages[0], "left")} />
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-black"
          style={half(pages[pages.length - 1], "right")}
        />

        {Array.from({ length: leaves }, (_, k) => (
          <div
            key={k}
            className="book-leaf absolute inset-y-0 left-1/2 w-1/2 origin-left [transform-style:preserve-3d]"
            style={{
              zIndex: z(k),
              transform: `rotateY(${k < turned ? -180 : 0}deg)`,
              transitionDuration: `${TURN_MS}ms`,
            }}
          >
            <div className="book-face absolute inset-0" style={half(pages[k], "right")}>
              <span className="book-shade-right" />
            </div>
            <div
              className="book-face absolute inset-0 [transform:rotateY(180deg)]"
              style={half(pages[k + 1], "left")}
            >
              <span className="book-shade-left" />
            </div>
          </div>
        ))}

        {/* The gutter: a soft shadow down the spine, over everything. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 z-[999] w-16 -translate-x-1/2"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,0,0,0.18) 42%, rgba(0,0,0,0.32) 50%, rgba(0,0,0,0.18) 58%, transparent)",
          }}
        />

        {/* Click targets: left half goes back, right half goes forward. */}
        <button
          type="button"
          aria-label="Previous spread"
          onClick={() => go(-1)}
          disabled={turned === 0}
          className="absolute inset-y-0 left-0 z-[1000] w-1/2 cursor-w-resize disabled:cursor-default"
        />
        <button
          type="button"
          aria-label="Next spread"
          onClick={() => go(1)}
          disabled={turned === leaves}
          className="absolute inset-y-0 right-0 z-[1000] w-1/2 cursor-e-resize disabled:cursor-default"
        />
      </div>

      <figcaption className="mt-3 flex items-center justify-between font-label text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={turned === 0}
          className="cursor-pointer transition-opacity hover:text-foreground disabled:cursor-default disabled:opacity-30"
        >
          ← Prev
        </button>
        <span className="tabular-nums">
          Spread {String(turned + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={turned === leaves}
          className="cursor-pointer transition-opacity hover:text-foreground disabled:cursor-default disabled:opacity-30"
        >
          Next →
        </button>
      </figcaption>
    </figure>
  );
}
