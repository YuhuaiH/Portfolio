"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FilmRoll, Photo } from "@/lib/photos";
import PhotoInfoModal from "./PhotoInfoModal";
import { useFilmFocus } from "./FilmFocusProvider";

const FilmScene = dynamic(() => import("./FilmScene"), {
  ssr: false,
  loading: () => <div className="mt-6 h-[320px] w-full animate-pulse bg-foreground/5 sm:mt-8 sm:h-[400px]" />,
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
    // mb-2, not mb-16 — see the earlier note on this fix: this section's
    // own bottom margin was stacking on top of the work page's own pb-16,
    // doubling up to ~128px of dead space below the scene. Back to a plain
    // mt-6/mt-8 + h-[320px]/[400px] box now — where the roll row actually
    // *sits* within this box is a job for the camera (see the lookAt.y note
    // in FilmScene.tsx's SceneController), not this element's own size.
    <section className="mb-2">
      {/* The heading + film/digital switcher live in SceneHeader (rendered
          once in layout.tsx) rather than here — see FilmFocusProvider for
          how this component's focused roll reaches that persistent header. */}
      <div className="mt-6 h-[320px] w-full touch-none cursor-grab bg-[radial-gradient(ellipse_at_center,_rgba(219,168,63,0.1)_0%,_rgba(219,168,63,0)_65%)] active:cursor-grabbing sm:mt-8 sm:h-[400px]">
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
