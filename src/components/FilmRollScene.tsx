"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { FilmRoll, Photo } from "@/lib/photos";

const FilmReel3D = dynamic(() => import("./FilmReel3D"), {
  ssr: false,
  loading: () => <div className="h-[520px] w-full animate-pulse bg-white/5 sm:h-[600px]" />,
});

function PhotoInfoModal({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const date = new Date(photo.time).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border border-white/15 bg-black p-6 text-center"
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
          onClick={onClose}
          className="mt-5 text-xs tracking-[0.15em] text-muted uppercase hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function FilmRollScene({ roll }: { roll: FilmRoll }) {
  const [selected, setSelected] = useState<Photo | null>(null);

  return (
    <section className="mb-16">
      <div className="mb-2 px-6 text-center sm:px-12">
        <h2 className="font-heading text-lg tracking-wide">{roll.name}</h2>
        <p className="text-xs tracking-[0.15em] text-muted uppercase">
          {roll.photos.length} photo{roll.photos.length === 1 ? "" : "s"} · drag to pull the film out ·
          click a frame for details
        </p>
      </div>
      <div className="h-[520px] w-full touch-none cursor-grab bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.07)_0%,_rgba(255,255,255,0)_65%)] active:cursor-grabbing sm:h-[600px]">
        <FilmReel3D photos={roll.photos} onPhotoClick={setSelected} />
      </div>
      {selected && <PhotoInfoModal photo={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
