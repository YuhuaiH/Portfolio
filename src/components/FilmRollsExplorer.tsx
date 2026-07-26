"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { FilmRoll, Photo } from "@/lib/photos";

const FilmScene = dynamic(() => import("./FilmScene"), {
  ssr: false,
  loading: () => <div className="h-[560px] w-full animate-pulse bg-white/5 sm:h-[640px]" />,
});

const MODAL_TRANSITION_MS = 220;

function formatDate(time: string) {
  return new Date(time).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function PhotoInfoModal({ photo, onClose }: { photo: Photo; onClose: () => void }) {
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-sm border border-white/15 bg-black p-6 text-center transition-all duration-200 ease-out ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photo.src}
          alt={photo.name}
          width={photo.width}
          height={photo.height}
          className="mx-auto mb-4 h-auto max-h-[50vh] w-auto"
        />
        <h3 className="font-heading text-lg tracking-wide">{photo.name}</h3>
        <p className="mt-1 text-xs tracking-[0.15em] text-muted uppercase">
          {date} · {photo.type === "film" ? photo.filmRoll : "Digital"}
        </p>
        <button
          onClick={handleClose}
          className="mt-5 text-xs tracking-[0.15em] text-muted uppercase hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function FilmRollsExplorer({ filmRolls }: { filmRolls: FilmRoll[] }) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (selectedPhoto) return; // modal's own handler takes it
      setFocusedIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPhoto]);

  const focused = focusedIndex !== null ? filmRolls[focusedIndex] : null;

  return (
    <section className="mb-16">
      <div className="mb-2 px-6 text-center sm:px-12">
        {focused ? (
          <>
            <button
              onClick={() => setFocusedIndex(null)}
              className="mb-2 text-xs tracking-[0.15em] text-muted uppercase hover:text-foreground"
            >
              ← All rolls
            </button>
            <h2 className="font-heading text-lg tracking-wide">{focused.name}</h2>
            <p className="text-[11px] tracking-[0.15em] text-muted/70 uppercase">
              {formatDate(focused.time)}
            </p>
            <p className="text-xs tracking-[0.15em] text-muted uppercase">
              {focused.photos.length} photo{focused.photos.length === 1 ? "" : "s"} · drag to pull
              the film out · click a frame for details
            </p>
          </>
        ) : (
          <>
            <h2 className="font-heading text-lg tracking-wide">Film</h2>
            <p className="text-xs tracking-[0.15em] text-muted uppercase">
              {filmRolls.length} roll{filmRolls.length === 1 ? "" : "s"} · click a roll to explore
            </p>
          </>
        )}
      </div>
      <div className="h-[560px] w-full touch-none cursor-grab bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.07)_0%,_rgba(255,255,255,0)_65%)] active:cursor-grabbing sm:h-[640px]">
        <FilmScene
          filmRolls={filmRolls}
          focusedIndex={focusedIndex}
          onSelectRoll={setFocusedIndex}
          onPhotoClick={setSelectedPhoto}
        />
      </div>
      {selectedPhoto && <PhotoInfoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}
    </section>
  );
}
