"use client";

import dynamic from "next/dynamic";
import type { FilmRoll } from "@/lib/photos";

const FilmReel3D = dynamic(() => import("./FilmReel3D"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse bg-white/5" />,
});

export default function FilmRollScene({ roll }: { roll: FilmRoll }) {
  return (
    <section className="mb-16">
      <div className="mb-2 px-6 text-center sm:px-12">
        <h2 className="font-heading text-lg tracking-wide">{roll.name}</h2>
        <p className="text-xs tracking-[0.15em] text-muted uppercase">
          {roll.photos.length} photo{roll.photos.length === 1 ? "" : "s"} · drag to spin
        </p>
      </div>
      <div className="h-[420px] w-full touch-none cursor-grab active:cursor-grabbing">
        <FilmReel3D photos={roll.photos} />
      </div>
    </section>
  );
}
