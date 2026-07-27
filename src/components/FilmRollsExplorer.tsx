"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FilmRoll, Photo } from "@/lib/photos";
import PhotoInfoModal, { formatDate } from "./PhotoInfoModal";

const FilmScene = dynamic(() => import("./FilmScene"), {
  ssr: false,
  loading: () => <div className="h-[560px] w-full animate-pulse bg-white/5 sm:h-[640px]" />,
});

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
