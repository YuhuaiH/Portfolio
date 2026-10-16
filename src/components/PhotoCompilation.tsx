"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { Photo } from "@/lib/photos";

// Same basePath fix as everywhere else that builds a public/ URL by hand.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type CompilationPhoto = Pick<Photo, "id" | "gridSrc" | "previewSrc" | "width" | "height" | "name"> & {
  // Optional: the viewer shows it under the name when there is one.
  time?: string;
};

// "2026-03-14" → "March 14, 2026"; anything that isn't a parseable date
// ("October 2025") is shown as written.
function formatTime(time: string) {
  if (!/^\d{4}-\d{2}/.test(time)) return time;
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

// A fresh random order on every visit, so the compilation never reads the
// same way twice. Shuffled only in the browser, after hydration: the page
// is statically exported, so a server-side shuffle would freeze one order
// into the HTML for everyone. A seeded Fisher-Yates, so "Shuffle" can just
// pick a new seed.
function shuffled<T>(items: T[], seed: number): T[] {
  let s = seed | 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// False during server render and hydration, true once running in the
// browser — so the shuffled order never mismatches the server HTML.
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// One photo in the grid — fades in once it has actually loaded, so rows
// fill in softly rather than popping as each image arrives.
function Tile({
  photo,
  index,
  onOpen,
  register,
}: {
  photo: CompilationPhoto;
  index: number;
  onOpen: () => void;
  register: (id: string, el: HTMLLIElement | null) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Already in the browser cache: onLoad can fire before hydration attaches
  // the handler, so check once on mount too.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);
  const ratio = photo.width / photo.height;
  return (
    // Justified rows in pure CSS: every tile grows in proportion to its
    // aspect ratio from a basis of (ratio × row height), so a row fills the
    // full width and every photo in it ends up the same height — no
    // cropping, each at its own shape.
    <li
      ref={(el) => register(photo.id, el)}
      className="relative will-change-transform"
      style={{ flexGrow: ratio, flexBasis: `calc(${ratio} * var(--row-h))` } as CSSProperties}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${photo.name}`}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[4px] bg-foreground/5"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a
            pre-generated public/ derivative under static export; the grid
            needs plain lazy <img> with intrinsic sizes, nothing more. */}
        <img
          ref={imgRef}
          src={`${BASE_PATH}${photo.gridSrc}`}
          alt={photo.name}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          // Entrance: each photo rises in as it loads, staggered a little
          // by its place in the grid (capped, so photos far down the page
          // don't wait), so rows fill in like a sheet being dealt.
          style={{ transitionDelay: loaded ? `${Math.min(index, 12) * 45}ms` : "0ms" }}
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,translate,scale] duration-700 ease-out group-hover:scale-[1.03] ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-6 pb-2 text-left font-label text-[11px] tracking-[0.12em] text-foreground uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {photo.name}
        </span>
      </button>
    </li>
  );
}

// Full-screen viewer: the large preview, its name and date, ← / → (or a
// swipe) through the whole compilation, Esc or a click outside to close.
function Viewer({
  photos,
  index,
  onStep,
  onClose,
}: {
  photos: CompilationPhoto[];
  index: number;
  onStep: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const [shown, setShown] = useState(false);
  const swipeX = useRef<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, onStep]);

  // Warm the neighbors, so stepping through feels instant.
  useEffect(() => {
    for (const d of [1, -1]) {
      const n = photos[(index + d + photos.length) % photos.length];
      const img = new Image();
      img.src = `${BASE_PATH}${n.previewSrc}`;
    }
  }, [index, photos]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.name}
      onClick={onClose}
      onPointerDown={(e) => (swipeX.current = e.clientX)}
      onPointerUp={(e) => {
        if (swipeX.current === null) return;
        const dx = e.clientX - swipeX.current;
        swipeX.current = null;
        if (Math.abs(dx) > 60) onStep(dx < 0 ? 1 : -1);
      }}
      className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-black/92 px-4 py-14 backdrop-blur-sm transition-opacity duration-300 sm:px-16 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-size
          view, sized to the viewport with object-contain. */}
      <img
        key={photo.id}
        src={`${BASE_PATH}${photo.previewSrc}`}
        alt={photo.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-[4px] object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 font-label text-[11px] tracking-[0.16em] uppercase">
        <span className="text-foreground">{photo.name}</span>
        <span className="text-foreground/55">
          {photo.time ? `${formatTime(photo.time)} · ` : ""}
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </span>
      </div>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            className="absolute top-1/2 left-1 hidden -translate-y-1/2 cursor-pointer p-4 text-2xl text-foreground/60 hover:text-foreground sm:left-4 sm:block"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            className="absolute top-1/2 right-1 hidden -translate-y-1/2 cursor-pointer p-4 text-2xl text-foreground/60 hover:text-foreground sm:right-4 sm:block"
          >
            →
          </button>
        </>
      )}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-3 right-3 cursor-pointer p-3 font-label text-xs tracking-[0.16em] text-foreground/70 uppercase hover:text-foreground sm:top-5 sm:right-6"
      >
        Close ✕
      </button>
    </div>
  );
}

// A compilation of photos, like the old Carbonmade photography page: every
// photo at its own shape, packed into full-width rows of equal height, in
// a random order each visit, opening into a full-screen viewer you can
// page through.
export default function PhotoCompilation({ photos }: { photos: CompilationPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const hydrated = useHydrated();
  // Two modes: shuffled (the default — a new random order every visit) or
  // in order (by name, as the page lists them). Switching back to
  // shuffled deals a fresh order rather than the same one again.
  const [mode, setMode] = useState<"shuffled" | "ordered">("shuffled");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  // FLIP reorder animation: just before the order changes, note where
  // every photo is; once the new order has laid out, start each photo back
  // at its old spot and size and let it glide to the new one.
  const tiles = useRef(new Map<string, HTMLLIElement>());
  const before = useRef<Map<string, DOMRect> | null>(null);
  const register = useCallback((id: string, el: HTMLLIElement | null) => {
    if (el) tiles.current.set(id, el);
    else tiles.current.delete(id);
  }, []);

  const toggleMode = () => {
    before.current = new Map([...tiles.current].map(([id, el]) => [id, el.getBoundingClientRect()]));
    if (mode === "ordered") setSeed(Math.floor(Math.random() * 2 ** 31));
    setMode(mode === "shuffled" ? "ordered" : "shuffled");
    setOpen(null);
  };
  // The viewer pages through this same order.
  const order = useMemo(
    () => (hydrated && mode === "shuffled" ? shuffled(photos, seed) : photos),
    [hydrated, mode, photos, seed]
  );

  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const moved: HTMLLIElement[] = [];
    tiles.current.forEach((el, id) => {
      const from = prev.get(id);
      if (!from) return;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(from.width - to.width) < 1) return;
      el.style.transition = "none";
      el.style.transformOrigin = "0 0";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`;
      moved.push(el);
    });
    if (moved.length === 0) return;
    // Commit the "from" pose, then release every photo to its new place.
    void document.body.offsetHeight;
    requestAnimationFrame(() => {
      moved.forEach((el, i) => {
        el.style.transition = `transform 650ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(i, 20) * 12}ms`;
        el.style.transform = "";
      });
    });
  }, [order]);
  const step = useCallback(
    (dir: 1 | -1) => setOpen((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length]
  );
  const close = useCallback(() => setOpen(null), []);

  if (photos.length === 0) {
    return (
      <p className="mt-16 text-center font-heading text-2xl text-foreground italic sm:text-3xl">Coming Soon</p>
    );
  }

  return (
    <>
      {/* --row-h: the target row height, smaller on narrow screens. The
          trailing filler item soaks up the last row's spare width, so a
          short last row keeps its photos at the normal row height instead
          of blowing them up to fill the whole width. */}
      <div className="mb-4 flex justify-end">
        {/* One switch between the two modes: shows the current one, and
            says what a click will do on hover. */}
        <button
          type="button"
          onClick={toggleMode}
          aria-pressed={mode === "shuffled"}
          title={mode === "shuffled" ? "Show in order (by name)" : "Shuffle"}
          className="group cursor-pointer font-label text-[11px] tracking-[0.16em] text-muted uppercase transition-colors hover:text-foreground"
        >
          {mode === "shuffled" ? "⤨ Shuffled" : "↓ In order"}
          <span className="ml-2 text-foreground/35 transition-colors group-hover:text-foreground/60">
            {mode === "shuffled" ? "/ in order" : "/ shuffle"}
          </span>
        </button>
      </div>
      {/* Hidden until shuffled, so the server's date order never flashes
          up first and then jumps. */}
      <ul
        className={`flex flex-wrap gap-2 transition-opacity duration-500 [--row-h:170px] sm:gap-3 sm:[--row-h:240px] lg:[--row-h:300px] ${
          hydrated ? "opacity-100" : "opacity-0"
        }`}
      >
        {order.map((photo, i) => (
          <Tile key={photo.id} photo={photo} index={i} onOpen={() => setOpen(i)} register={register} />
        ))}
        <li aria-hidden style={{ flexGrow: 10000, flexBasis: 0, height: 0 }} />
      </ul>
      {open !== null && <Viewer photos={order} index={open} onStep={step} onClose={close} />}
    </>
  );
}
