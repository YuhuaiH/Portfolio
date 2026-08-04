"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FilmRoll, Photo } from "@/lib/photos";
import PhotoInfoModal from "./PhotoInfoModal";
import { useFilmFocus } from "./FilmFocusProvider";

const FilmScene = dynamic(() => import("./FilmScene"), {
  ssr: false,
  loading: () => <div className="mt-6 h-[420px] w-full animate-pulse bg-white/5 sm:mt-8 sm:h-[480px]" />,
});

export default function FilmRollsExplorer({ filmRolls }: { filmRolls: FilmRoll[] }) {
  const { focusedIndex, setFocusedIndex } = useFilmFocus();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (selectedPhoto) return; // modal's own handler takes it
      setFocusedIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPhoto, setFocusedIndex]);

  return (
    <section className="mb-16">
      {/* The heading + film/digital switcher live in SceneHeader (rendered
          once in layout.tsx) rather than here — see FilmFocusProvider for
          how this component's focused roll reaches that persistent header. */}
      <div className="mt-6 h-[420px] w-full touch-none cursor-grab bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.07)_0%,_rgba(255,255,255,0)_65%)] active:cursor-grabbing sm:mt-8 sm:h-[480px]">
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
