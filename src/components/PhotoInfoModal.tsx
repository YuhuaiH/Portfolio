"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";

const MODAL_TRANSITION_MS = 220;

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — the
// basePath-prefixing logic lives in the default loader, which
// unoptimized mode bypasses entirely. Same fix as SiteHeader.tsx /
// FilmScene.tsx / DigitalCityScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function formatDate(time: string) {
  return new Date(time).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function PhotoInfoModal({
  photo,
  onClose,
}: {
  photo: Photo;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function handleClose() {
    setVisible(false);
    closeTimeoutRef.current = setTimeout(onClose, MODAL_TRANSITION_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = formatDate(photo.time);
  // Landscape photos are width-limited by the card, not height-limited like
  // portrait ones — a fixed max-w-sm left them looking small since it capped
  // the dimension that actually had room to grow. Give landscape photos a
  // wider card (and a bit more vertical headroom to match) instead.
  const isLandscape = photo.width >= photo.height;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`w-full border border-white/15 bg-black p-6 text-center transition-all duration-200 ease-out ${
          isLandscape ? "max-w-3xl" : "max-w-md"
        } ${visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={`${BASE_PATH}${photo.previewSrc}`}
          alt={photo.name}
          width={photo.width}
          height={photo.height}
          className={`mx-auto mb-4 h-auto w-auto ${isLandscape ? "max-h-[75vh]" : "max-h-[62vh]"}`}
        />
        <h3 className="font-heading text-lg tracking-wide">{photo.name}</h3>
        <p className="mt-1 text-xs tracking-[0.15em] text-muted uppercase">
          {date} · {photo.type === "film" ? photo.filmRoll : "Digital"}
        </p>
        <div className="mt-5 flex items-center justify-center gap-4">
          <a
            href={`${BASE_PATH}${photo.src}`}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs tracking-[0.15em] text-muted uppercase hover:text-foreground"
          >
            Full resolution
          </a>
          <button
            onClick={handleClose}
            className="text-xs tracking-[0.15em] text-muted uppercase hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
