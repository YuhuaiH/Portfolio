"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export type CollectionImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

// Every image in an entry's folder (see the "collection" block in
// workEntries.ts), each at its real shape — collages are every size and
// orientation, and cropping them to a uniform grid would cut into the work.
// Click one to see it large; ← / → step through, Esc (or a click outside)
// closes.
//
// columns: 1 (the default) stacks the pieces edge to edge, full width, as
// one continuous strip — no gaps, no per-piece frames, one frame around the
// whole run — so each collage runs straight into the next. 2 or 3 lay them
// out as a masonry wall of separately framed pieces instead.
export default function CollectionGrid({
  images,
  columns = 1,
}: {
  images: CollectionImage[];
  columns?: 1 | 2 | 3;
}) {
  const strip = columns === 1;
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) =>
        i === null ? i : (i + dir + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, step]);

  if (images.length === 0) {
    return (
      <p className="mt-6 font-label text-[11px] tracking-[0.16em] text-muted uppercase">
        Nothing here yet
      </p>
    );
  }

  const current = open === null ? null : images[open];

  return (
    <>
      {/* Wall: spacing between pieces is padding inside each unbreakable
          item, not a margin — CSS columns carry a margin across a column
          break, which left a gap at the top of the next column. */}
      <ul
        className={
          strip
            ? "overflow-hidden rounded-[14px] ring-1 ring-foreground/15"
            : `-mb-4 gap-4 sm:columns-2 ${columns === 3 ? "lg:columns-3" : ""}`
        }
      >
        {images.map((image, i) => (
          <li
            key={image.src}
            className={strip ? "" : "break-inside-avoid pb-4"}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              className={`group block w-full cursor-zoom-in overflow-hidden bg-black ${
                strip ? "" : "rounded-[14px] ring-1 ring-foreground/15"
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes={
                  strip
                    ? "(min-width: 1152px) 1056px, 100vw"
                    : "(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                }
                // block, not the default inline: an inline image leaves a strip
                // of line-height under it, a dark band inside the frame.
                // No hover zoom in a strip: a piece swelling into its neighbors
                // would break the seam between them.
                className={`block h-auto w-full ${
                  strip
                    ? ""
                    : "transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-size
              view of an already-loaded public/ file; next/image's fixed
              width/height model fights a contain-to-viewport layout. */}
          <img
            src={current.src}
            alt={current.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-[6px] object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-6 font-label text-[11px] tracking-[0.16em] text-foreground/80 uppercase">
            <span>{current.alt}</span>
            <span className="tabular-nums opacity-60">
              {String((open ?? 0) + 1).padStart(2, "0")} /{" "}
              {String(images.length).padStart(2, "0")}
            </span>
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute top-1/2 left-2 -translate-y-1/2 cursor-pointer p-4 text-2xl text-foreground/70 hover:text-foreground sm:left-6"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-4 text-2xl text-foreground/70 hover:text-foreground sm:right-6"
              >
                →
              </button>
            </>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="absolute top-3 right-3 cursor-pointer p-3 font-label text-xs tracking-[0.16em] text-foreground/70 uppercase hover:text-foreground sm:top-6 sm:right-6"
          >
            Close ✕
          </button>
        </div>
      )}
    </>
  );
}
